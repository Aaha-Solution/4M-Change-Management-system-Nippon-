import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

export const getL3Approvals = async () => {
  const [rows] = await pool.query(
    `SELECT c.id as changeNo, 
            DATE_FORMAT(c.date, '%e %b') as date, 
            COALESCE(l1.request_by, u.name, c.requester) as requester,
            COALESCE(l1.dept, u.department) as raisedDept,
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
     INNER JOIN l2_validation_logs v ON c.id = v.change_no AND v.status = 'Accepted'
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

    // Fetch existing L3 approval before update to detect HOD decision changes
    const [existingL3Rows] = await connection.query(
      `SELECT ped, quality, production, maintenance, pcl, materials, marketing, hr, safety, unit_head as unitHead
       FROM l3_approvals WHERE change_no = ?`,
      [changeNo]
    );

    let updatedDeptField = null;
    let newDecision = null;

    if (existingL3Rows.length > 0) {
      const dbL3 = existingL3Rows[0];
      const fields = [
        { key: 'ped', db: dbL3.ped, label: 'PED' },
        { key: 'quality', db: dbL3.quality, label: 'Quality' },
        { key: 'production', db: dbL3.production, label: 'Production' },
        { key: 'maintenance', db: dbL3.maintenance, label: 'Maintenance' },
        { key: 'pcl', db: dbL3.pcl, label: 'PC & L' },
        { key: 'materials', db: dbL3.materials, label: 'Materials' },
        { key: 'marketing', db: dbL3.marketing, label: 'Marketing' },
        { key: 'hr', db: dbL3.hr, label: 'HR' },
        { key: 'safety', db: dbL3.safety, label: 'Safety' },
        { key: 'unitHead', db: dbL3.unitHead, label: 'Unit Head' }
      ];

      for (const field of fields) {
        const incomingVal = logData[field.key];
        if (incomingVal && incomingVal !== 'Pending' && incomingVal !== field.db) {
          updatedDeptField = field.label;
          newDecision = incomingVal;
          break;
        }
      }
    } else {
      const fields = [
        { key: 'ped', val: ped, label: 'PED' },
        { key: 'quality', val: quality, label: 'Quality' },
        { key: 'production', val: production, label: 'Production' },
        { key: 'maintenance', val: maintenance, label: 'Maintenance' },
        { key: 'pcl', val: pcl, label: 'PC & L' },
        { key: 'materials', val: materials, label: 'Materials' },
        { key: 'marketing', val: marketing, label: 'Marketing' },
        { key: 'hr', val: hr, label: 'HR' },
        { key: 'safety', val: safety, label: 'Safety' },
        { key: 'unitHead', val: unitHead, label: 'Unit Head' }
      ];

      for (const field of fields) {
        if (field.val && field.val !== 'Pending') {
          updatedDeptField = field.label;
          newDecision = field.val;
          break;
        }
      }
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

    // Fetch raisedDept
    const [crRows] = await connection.query(
      `SELECT COALESCE(l1.dept, u.department) as raisedDept
       FROM change_requests c
       LEFT JOIN l1_requests l1 ON c.id = l1.change_no
       LEFT JOIN users u ON c.requester = u.email
       WHERE c.id = ?`,
      [changeNo]
    );
    const raisedDept = crRows.length > 0 ? crRows[0].raisedDept : '';

    const mapDbDeptToL3Dept = (dbDept) => {
      if (!dbDept) return 'Quality';
      const dept = dbDept.trim().toLowerCase();
      if (dept === 'qad' || dept === 'quality') return 'Quality';
      if (dept === 'ped') return 'PED';
      if (dept === 'production') return 'Production';
      if (dept === 'maintenance') return 'Maintenance';
      if (dept === 'pc & l' || dept === 'pcl') return 'PC & L';
      if (dept === 'materials') return 'Materials';
      if (dept === 'marketing') return 'Marketing';
      if (dept === 'hr') return 'HR';
      if (dept === 'safety') return 'Safety';
      if (dept === 'unit head' || dept === 'unit_head') return 'Unit Head';
      return 'Quality';
    };

    const mappedRaisedDept = mapDbDeptToL3Dept(raisedDept);

    let isSpecificDecided = false;
    if (mappedRaisedDept === 'PED') isSpecificDecided = ['Approved', 'Rejected'].includes(ped);
    else if (mappedRaisedDept === 'Quality') isSpecificDecided = ['Approved', 'Rejected'].includes(quality);
    else if (mappedRaisedDept === 'Production') isSpecificDecided = ['Approved', 'Rejected'].includes(production);
    else if (mappedRaisedDept === 'Maintenance') isSpecificDecided = ['Approved', 'Rejected'].includes(maintenance);
    else if (mappedRaisedDept === 'PC & L') isSpecificDecided = ['Approved', 'Rejected'].includes(pcl);
    else if (mappedRaisedDept === 'Materials') isSpecificDecided = ['Approved', 'Rejected'].includes(materials);
    else if (mappedRaisedDept === 'Marketing') isSpecificDecided = ['Approved', 'Rejected'].includes(marketing);
    else if (mappedRaisedDept === 'HR') isSpecificDecided = ['Approved', 'Rejected'].includes(hr);
    else if (mappedRaisedDept === 'Safety') isSpecificDecided = ['Approved', 'Rejected'].includes(safety);
    else if (mappedRaisedDept === 'Unit Head') isSpecificDecided = ['Approved', 'Rejected'].includes(unitHead);

    if (isSpecificDecided) {
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

    // Send L3 decision notifications to ALL department HODs + originating dept
    const notifIdsToSend = [];
    if (updatedDeptField && newDecision) {
      const [l1Rows] = await connection.query(
        `SELECT dept, change_in, request_by FROM l1_requests WHERE change_no = ?`,
        [changeNo]
      );
      const l1Dept = l1Rows.length > 0 ? l1Rows[0].dept : '';
      const changeIn = l1Rows.length > 0 ? l1Rows[0].change_in : '';
      const requestBy = l1Rows.length > 0 ? l1Rows[0].request_by : requester;

      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;
      const color = newDecision === 'Approved' ? 'green' : 'red';

      // Fetch ALL departments to notify every HOD
      const [allDeptRows] = await connection.query(
        `SELECT DISTINCT department FROM users WHERE department != '' AND department IS NOT NULL`
      );

      for (const deptRow of allDeptRows) {
        const dept = deptRow.department;
        // Keep ID short — VARCHAR(50) limit. Format: L3N-{changeNo}-{deptSlug}-{ts8}-{rnd3}
        const ts8   = Date.now().toString().slice(-8);
        const rnd3  = Math.random().toString(36).slice(2, 5);
        const dSlug = dept.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
        const notifId = `L3N-${changeNo}-${dSlug}-${ts8}-${rnd3}`;
        const title = `L3 ${newDecision} by ${updatedDeptField} HOD – ${changeNo}`;
        const details = `CR ${changeNo}${changeIn ? ` (${changeIn})` : ''} raised by ${requestBy} has been ${newDecision.toLowerCase()} by the ${updatedDeptField} HOD at L3. Dept (${dept}) notified.`;

        await connection.query(
          `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
           VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
          [notifId, title, details, changeNo, changeIn || 'GENERAL', dept, timeStr, 'System Logs', color]
        );
        notifIdsToSend.push(notifId);
      }

      // Also notify the originating dept if not already covered by the loop above
      if (l1Dept && !allDeptRows.some(r => r.department === l1Dept)) {
        const ts8   = Date.now().toString().slice(-8);
        const rnd3  = Math.random().toString(36).slice(2, 5);
        const dSlug = l1Dept.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
        const notifId = `L3N-${changeNo}-${dSlug}-${ts8}-${rnd3}`;
        const title = `L3 ${newDecision} by ${updatedDeptField} HOD – ${changeNo}`;
        const details = `CR ${changeNo}${changeIn ? ` (${changeIn})` : ''} has been ${newDecision.toLowerCase()} by the ${updatedDeptField} HOD at L3.`;

        await connection.query(
          `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
           VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
          [notifId, title, details, changeNo, changeIn || 'GENERAL', l1Dept, timeStr, 'System Logs', color]
        );
        notifIdsToSend.push(notifId);
      }
    }

    await connection.commit();
    broadcast({ type: 'REFRESH_CHANGES' });
    broadcast({ type: 'REFRESH_NOTIFICATIONS' });

    // Send email notifications to all HOD users asynchronously after commit
    if (notifIdsToSend.length > 0 && updatedDeptField && newDecision) {
      (async () => {
        try {
          const { sendEmailForNotification } = await import('./notificationModel.js');
          for (const notifId of notifIdsToSend) {
            await sendEmailForNotification(notifId).catch(err =>
              console.error(`Error sending L3 notification email for ${notifId}:`, err)
            );
          }
        } catch (err) {
          console.error('Error in L3 email notification loop:', err);
        }
      })();
    }

    return logData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
