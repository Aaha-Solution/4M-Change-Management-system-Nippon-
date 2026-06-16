import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

export const getNotifications = async (email, role) => {
  let query = `
    SELECT id, title, details, change_no as changeNo, category, dept, time_str as time, is_read as isRead, type, color, recipient_email as recipientEmail 
    FROM notifications
  `;
  const params = [];

  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager');

  const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
  const department = userRows.length > 0 ? userRows[0].department : '';

  let userConditions = [];
  if (!isAdmin) {
    if (department) {
      userConditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      userConditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      userConditions.push(`(id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%')`);
    }
  } else {
    // Admin only receives general notifications (where dept is 'General', empty, or null)
    userConditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  let mainCondition = `(LOWER(recipient_email) = LOWER(?) OR ((recipient_email IS NULL OR recipient_email = '')`;
  params.unshift(email); // Put email as first parameter

  if (userConditions.length > 0) {
    mainCondition += ` AND ` + userConditions.join(' AND ');
  }
  mainCondition += `))`;

  query += ` WHERE ` + mainCondition;
  query += ` ORDER BY created_at DESC `;

  const [rows] = await pool.query(query, params);
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
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  return rows.length > 0 ? { ...rows[0], isRead: !!rows[0].isRead } : null;
};

export const markAllRead = async (email, role) => {
  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager');

  const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
  const department = userRows.length > 0 ? userRows[0].department : '';

  let userConditions = [];
  const params = [];
  if (!isAdmin) {
    if (department) {
      userConditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      userConditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      userConditions.push(`(id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%')`);
    }
  } else {
    // Admin only marks general notifications as read
    userConditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  let mainCondition = `(LOWER(recipient_email) = LOWER(?) OR ((recipient_email IS NULL OR recipient_email = '')`;
  params.unshift(email); // Put email as first parameter

  if (userConditions.length > 0) {
    mainCondition += ` AND ` + userConditions.join(' AND ');
  }
  mainCondition += `))`;

  let query = `UPDATE notifications SET is_read = TRUE WHERE ` + mainCondition;

  await pool.query(query, params);
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  return { success: true };
};

export const deleteNotification = async (id) => {
  await pool.query(`DELETE FROM notifications WHERE id = ?`, [id]);
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  return { id };
};

export const clearRead = async (email, role) => {
  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager');

  const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
  const department = userRows.length > 0 ? userRows[0].department : '';

  let userConditions = [];
  const params = [];
  if (!isAdmin) {
    if (department) {
      userConditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      userConditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      userConditions.push(`(id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%')`);
    }
  } else {
    // Admin only clears read general notifications
    userConditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  let mainCondition = `(LOWER(recipient_email) = LOWER(?) OR ((recipient_email IS NULL OR recipient_email = '')`;
  params.unshift(email); // Put email as first parameter

  if (userConditions.length > 0) {
    mainCondition += ` AND ` + userConditions.join(' AND ');
  }
  mainCondition += `))`;

  let query = `DELETE FROM notifications WHERE is_read = TRUE AND ` + mainCondition;

  await pool.query(query, params);
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  return { success: true };
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
    broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

