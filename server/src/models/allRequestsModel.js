import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

export const getChanges = async () => {
  // Self-healing: auto-complete any change requests that have their specific L3 raised department approval set
  try {
    await pool.query(`
      UPDATE change_requests cr
      INNER JOIN l3_approvals l3 ON cr.id = l3.change_no
      LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
      LEFT JOIN users u ON cr.requester = u.email
      SET cr.status = 'Completed'
      WHERE cr.status != 'Completed'
        AND (
          (LOWER(COALESCE(l1.dept, u.department)) IN ('quality', 'qad', 'qa') AND l3.quality IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'ped' AND l3.ped IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'production' AND l3.production IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'maintenance' AND l3.maintenance IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) IN ('pc & l', 'pcl') AND l3.pcl IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'materials' AND l3.materials IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'marketing' AND l3.marketing IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'hr' AND l3.hr IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) = 'safety' AND l3.safety IN ('Approved', 'Rejected'))
          OR (LOWER(COALESCE(l1.dept, u.department)) IN ('unit head', 'unit_head') AND l3.unit_head IN ('Approved', 'Rejected'))
        )
    `);
  } catch (err) {
    console.error('Error auto-completing L3 requests in getChanges:', err);
  }

  const [rows] = await pool.query(
    `SELECT c.id, c.title, 
            COALESCE(l1.request_by, u.name, c.requester) as requester, 
            DATE_FORMAT(c.date, '%b %d, %Y') as date, c.priority, c.status,
            l1.dept, l1.process_name as processName, l1.machine_no as machineNo, l1.change_in as changeIn,
            l1.request_by as requestBy,
            c.requester as requesterEmail,
            v.status as l2Status,
            DATE_FORMAT(c.date, '%Y-%m-%d') as rawDate,
            DATE_FORMAT(l1.date_start, '%Y-%m-%d') as dateStart,
            CASE WHEN l3.ped = 'Approved' 
                  AND l3.quality = 'Approved' 
                  AND l3.production = 'Approved' 
                  AND l3.maintenance = 'Approved' 
                  AND l3.pcl = 'Approved' 
                  AND l3.materials = 'Approved' 
                  AND l3.marketing = 'Approved' 
                  AND l3.hr = 'Approved' 
                  AND l3.safety = 'Approved' 
                  AND l3.unit_head = 'Approved' THEN 1 ELSE 0 END as isL3Approved
     FROM change_requests c
     LEFT JOIN l1_requests l1 ON c.id = l1.change_no
     LEFT JOIN users u ON c.requester = u.email
     LEFT JOIN l2_validation_logs v ON c.id = v.change_no
     LEFT JOIN l3_approvals l3 ON c.id = l3.change_no
     ORDER BY c.created_at DESC`
  );
  return rows;
};

export const addChange = async (title, requester, priority) => {
  const newId = `CHG-${Math.floor(1000 + Math.random() * 9000)}`;
  const status = 'Pending';

  await pool.query(
    'INSERT INTO change_requests (id, title, requester, date, priority, status) VALUES (?, ?, ?, CURDATE(), ?, ?)',
    [newId, title, requester, priority || 'Medium', status]
  );

  broadcast({ type: 'REFRESH_CHANGES' });

  return {
    id: newId,
    title,
    requester,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    priority: priority || 'Medium',
    status
  };
};

export const updateChangeStatus = async (id, status) => {
  await pool.query(
    'UPDATE change_requests SET status = ? WHERE id = ?',
    [status, id]
  );
  broadcast({ type: 'REFRESH_CHANGES' });
  return { id, status };
};
