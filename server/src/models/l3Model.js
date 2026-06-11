import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

export const getL3Approvals = async () => {
  const [rows] = await pool.query(
    `SELECT c.id as changeNo, 
            DATE_FORMAT(c.date, '%e %b') as date, 
            COALESCE(l1.request_by, u.name, c.requester) as requester,
            v.status as l2Decision,
            v.remarks as l2Remarks,
            COALESCE(l.ped, 'Pending') as ped,
            COALESCE(l.quality, 'Pending') as quality,
            COALESCE(l.production, 'Pending') as production,
            COALESCE(l.maintenance, 'Pending') as maintenance,
            COALESCE(l.pcl, 'Pending') as pcl,
            COALESCE(l.materials, 'Pending') as materials,
            COALESCE(l.marketing, 'Pending') as marketing,
            COALESCE(l.hr, 'Pending') as hr,
            COALESCE(l.safety, 'Pending') as safety,
            COALESCE(l.unit_head, 'Pending') as unitHead
     FROM change_requests c
     LEFT JOIN l1_requests l1 ON c.id = l1.change_no
     LEFT JOIN users u ON c.requester = u.email
     INNER JOIN l2_validation_logs v ON c.id = v.change_no
     LEFT JOIN l3_approvals l ON c.id = l.change_no
     ORDER BY c.created_at DESC`
  );
  return rows;
};

export const addL3ApprovalLog = async (logData) => {
  const {
    changeNo, date, requester,
    ped, quality, production, maintenance, pcl, materials, marketing, hr, safety, unitHead
  } = logData;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existing] = await connection.query(
      `SELECT id FROM change_requests WHERE id = ?`,
      [changeNo]
    );

    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO change_requests (id, title, requester, date, priority, status) 
         VALUES (?, ?, ?, CURDATE(), 'Medium', 'Pending')`,
        [changeNo, `[L3 Auto] Approval for ${changeNo}`, 'admin@cms.com']
      );
    }

    await connection.query(
      `INSERT INTO l3_approvals (
        change_no, date, requester, ped, quality, production, 
        maintenance, pcl, materials, marketing, hr, safety, unit_head
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        date = VALUES(date),
        requester = VALUES(requester),
        ped = VALUES(ped),
        quality = VALUES(quality),
        production = VALUES(production),
        maintenance = VALUES(maintenance),
        pcl = VALUES(pcl),
        materials = VALUES(materials),
        marketing = VALUES(marketing),
        hr = VALUES(hr),
        safety = VALUES(safety),
        unit_head = VALUES(unit_head)`,
      [
        changeNo, date, requester,
        ped || 'Pending', quality || 'Pending', production || 'Pending',
        maintenance || 'Pending', pcl || 'Pending', materials || 'Pending',
        marketing || 'Pending', hr || 'Pending', safety || 'Pending', unitHead || 'Pending'
      ]
    );

    const allDecided =
      ['Approved', 'Rejected'].includes(ped) &&
      ['Approved', 'Rejected'].includes(quality) &&
      ['Approved', 'Rejected'].includes(production) &&
      ['Approved', 'Rejected'].includes(maintenance) &&
      ['Approved', 'Rejected'].includes(pcl) &&
      ['Approved', 'Rejected'].includes(materials) &&
      ['Approved', 'Rejected'].includes(marketing) &&
      ['Approved', 'Rejected'].includes(hr) &&
      ['Approved', 'Rejected'].includes(safety) &&
      ['Approved', 'Rejected'].includes(unitHead);

    if (allDecided) {
      await connection.query(
        `UPDATE change_requests SET status = 'Completed' WHERE id = ?`,
        [changeNo]
      );
    } else {
      const [crRow] = await connection.query(
        `SELECT status FROM change_requests WHERE id = ?`,
        [changeNo]
      );
      if (crRow.length > 0 && crRow[0].status === 'Completed') {
        await connection.query(
          `UPDATE change_requests SET status = 'Approved' WHERE id = ?`,
          [changeNo]
        );
      }
    }

    await connection.commit();
    broadcast({ type: 'REFRESH_CHANGES' });
    return logData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
