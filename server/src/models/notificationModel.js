import pool from '../config/db.js';

export const getNotifications = async (email, role) => {
  let query = `
    SELECT id, title, details, change_no as changeNo, category, dept, time_str as time, is_read as isRead, type, color 
    FROM notifications
  `;
  const params = [];

  if (role && !role.toLowerCase().includes('admin')) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    if (department) {
      query += ` WHERE LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL `;
      params.push(department);
    }
  }

  query += ` ORDER BY created_at DESC `;

  const [rows] = await pool.query(query, params);
  // Convert 1/0 to true/false for isRead
  return rows.map(r => ({ ...r, isRead: !!r.isRead }));
};

export const toggleReadStatus = async (id) => {
  // Toggle the is_read state
  await pool.query(
    `UPDATE notifications SET is_read = NOT is_read WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(
    `SELECT id, title, details, change_no as changeNo, category, dept, time_str as time, is_read as isRead, type, color 
     FROM notifications 
     WHERE id = ?`,
    [id]
  );
  return rows.length > 0 ? { ...rows[0], isRead: !!rows[0].isRead } : null;
};

export const markAllRead = async (email, role) => {
  let query = `UPDATE notifications SET is_read = TRUE`;
  const params = [];

  if (role && !role.toLowerCase().includes('admin')) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    if (department) {
      query += ` WHERE LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL`;
      params.push(department);
    }
  }

  await pool.query(query, params);
  return { success: true };
};

export const deleteNotification = async (id) => {
  await pool.query(`DELETE FROM notifications WHERE id = ?`, [id]);
  return { id };
};

export const clearRead = async (email, role) => {
  let query = `DELETE FROM notifications WHERE is_read = TRUE`;
  const params = [];

  if (role && !role.toLowerCase().includes('admin')) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    if (department) {
      query += ` AND (LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`;
      params.push(department);
    }
  }

  await pool.query(query, params);
  return { success: true };
};

export const createNotification = async ({ id, title, details, changeNo, category, dept, timeStr, type, color }) => {
  await pool.query(
    `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
    [id, title, details, changeNo || '', category || '', dept || '', timeStr || 'Just now', type || 'Action Required', color || 'blue']
  );
  return { id, title, details, changeNo, category, dept, time: timeStr || 'Just now', isRead: false, type: type || 'Action Required', color: color || 'blue' };
};

export const resetNotifications = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM notifications');
    await connection.query(`
      INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color) VALUES
      ('ALR-001', 'L2 Setup Validation Awaiting', 'Change Request 4M-2026-1 (Machine change in Welding Line A) requires L2 PED validation setup checklist.', '4M-2026-1', 'MACHINE', 'PED', 'Just now', FALSE, 'Action Required', 'blue'),
      ('ALR-002', 'Change Request Approved by HOD', 'Change Request 4M-2026-247 (Method calibration) has been approved by L3 HOD and forwarded to unit supervisor.', '4M-2026-247', 'METHOD', 'QAD', '2 hours ago', TRUE, 'System Logs', 'green'),
      ('ALR-003', 'L3 Final Review Required', 'Change Request 4M-2026-246 (Material spec adjustment in Injection Moulding B) reached L3 review stages.', '4M-2026-246', 'MATERIAL', 'PRODUCTION', '5 hours ago', FALSE, 'Action Required', 'blue'),
      ('ALR-004', 'Change Request Rejected', 'Change Request 4M-2026-244 (Man training syllabus update) was rejected by Quality HOD. Comments: Needs syllabus validation.', '4M-2026-244', 'MAN', 'MAINTENANCE', 'Yesterday', TRUE, 'System Logs', 'red'),
      ('ALR-005', 'Effectiveness Evaluation Due', 'The 3-Month QA post-implementation observation logs are now due for approved Request 4M-2026-231.', '4M-2026-231', 'SYSTEM', 'QA', '3 days ago', FALSE, 'Action Required', 'orange'),
      ('ALR-006', 'SSO Certificate Re-signature Done', 'SSO provider Auth0 corporate domain certificate updated and verified.', '4M-2026-230', 'SYSTEM', 'IT', '4 days ago', TRUE, 'System Logs', 'green')
    `);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
