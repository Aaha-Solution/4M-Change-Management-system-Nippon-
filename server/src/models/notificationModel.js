import pool from '../config/db.js';
import { broadcast } from '../config/websocket.js';

export const getNotifications = async (email, role) => {
  let query = `
    SELECT id, title, details, change_no as changeNo, category, dept, time_str as time, is_read as isRead, type, color 
    FROM notifications
  `;
  const params = [];

  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager') || roleLower.includes('unit head') || roleLower.includes('unit_head');

  let conditions = [];
  if (!isAdmin) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    
    if (department) {
      conditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      conditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      conditions.push(`id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%'`);
    }
  } else {
    // Admin only receives general notifications (where dept is 'General', empty, or null)
    conditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

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
  let query = `UPDATE notifications SET is_read = TRUE`;
  const params = [];

  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager') || roleLower.includes('unit head') || roleLower.includes('unit_head');

  let conditions = [];
  if (!isAdmin) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    
    if (department) {
      conditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      conditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      conditions.push(`id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%'`);
    }
  } else {
    // Admin only marks general notifications as read
    conditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

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
  let query = `DELETE FROM notifications WHERE is_read = TRUE`;
  const params = [];

  const roleLower = (role || '').toLowerCase();
  const isAdmin = roleLower.includes('admin') || roleLower.includes('administrator');
  const isHOD = roleLower.includes('hod') || roleLower.includes('manager') || roleLower.includes('unit head') || roleLower.includes('unit_head');

  let conditions = [];
  if (!isAdmin) {
    const [userRows] = await pool.query('SELECT department FROM users WHERE email = ?', [email]);
    const department = userRows.length > 0 ? userRows[0].department : '';
    
    if (department) {
      conditions.push(`(LOWER(dept) = LOWER(?) OR dept = '' OR dept IS NULL)`);
      params.push(department);
    } else {
      conditions.push(`(dept = '' OR dept IS NULL)`);
    }

    if (!isHOD) {
      conditions.push(`id NOT LIKE 'L1-HOD-NOTIF-%' AND title NOT LIKE '%HOD Approval%' AND title NOT LIKE '%L3 Final Review%'`);
    }
  } else {
    // Admin only clears read general notifications
    conditions.push(`(LOWER(dept) = 'general' OR dept = '' OR dept IS NULL)`);
  }

  if (conditions.length > 0) {
    query += ` AND ` + conditions.join(' AND ');
  }

  await pool.query(query, params);
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  return { success: true };
};

export const sendEmailForNotification = async (notificationId) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, details, change_no as changeNo, category, dept, type, color FROM notifications WHERE id = ?`,
      [notificationId]
    );
    if (rows.length === 0) return;
    const notification = rows[0];
    
    // Query users
    const [users] = await pool.query('SELECT email, role, department FROM users');

    let l1Details = null;
    if (notification.changeNo) {
      const [l1Rows] = await pool.query(
        `SELECT l1.change_no, l1.dept, l1.change_in, l1.request_by, l1.process_name, l1.process_line, l1.machine_no, l1.description, cr.title
         FROM l1_requests l1
         LEFT JOIN change_requests cr ON l1.change_no = cr.id
         WHERE l1.change_no = ?`,
        [notification.changeNo]
      );
      if (l1Rows.length > 0) {
        l1Details = l1Rows[0];
      }
    }
    
    // Determine target users
    const targetEmails = [];
    const notificationIdLower = (notification.id || '').toLowerCase();
    const notificationTitle = notification.title || '';
    const targetDept = (notification.dept || '').trim().toLowerCase();
    
    const isHodOnly = notificationIdLower.startsWith('l1-hod-notif-') || 
                      notificationTitle.includes('HOD Approval') || 
                      notificationTitle.includes('L3 Final Review');
                      
    for (const user of users) {
      const userEmail = user.email;
      const userRole = (user.role || '').toLowerCase();
      const userDept = (user.department || '').toLowerCase();
      
      const isAdmin = userRole.includes('admin') || userRole.includes('administrator');
      const isHOD = userRole.includes('hod') || userRole.includes('manager') || 
                    userRole.includes('unit head') || userRole.includes('unit_head');
      
      if (isAdmin) {
        // Only notify Admin via email if the notification is general
        if (!targetDept || targetDept === 'general') {
          targetEmails.push(userEmail);
        }
        continue;
      }
      
      // If notification is HOD only, but user is not HOD, skip
      if (isHodOnly && !isHOD) {
        continue;
      }
      
      // Check department matching
      if (targetDept) {
        // Notification is for a specific department
        if (userDept === targetDept) {
          targetEmails.push(userEmail);
        }
      } else {
        // Notification is general
        targetEmails.push(userEmail);
      }
    }
    
    if (targetEmails.length > 0) {
      const emailContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background-color: #ffffff;">
          <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -24px -24px 20px -24px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">4M Change Management System</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; tracking-wider: 1px;">System Alert Notification</p>
          </div>
          <p style="font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">${notification.title}</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #0066cc; padding: 16px; margin: 20px 0; font-size: 14px; color: #475569; line-height: 1.6; border-radius: 4px;">
            ${notification.details}
          </div>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #475569;">
            ${notification.changeNo ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 30%;"><strong>Change Request #</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${notification.changeNo}</td></tr>` : ''}
            ${l1Details && l1Details.title ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Title</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${l1Details.title}</td></tr>` : ''}
            ${(l1Details && l1Details.change_in) || notification.category ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Category</strong></td><td style="padding: 10px 0; color: #1e293b;">${(l1Details && l1Details.change_in) || notification.category}</td></tr>` : ''}
            ${l1Details && l1Details.request_by ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Requested By</strong></td><td style="padding: 10px 0; color: #1e293b;">${l1Details.request_by} ${l1Details.dept ? `(${l1Details.dept})` : ''}</td></tr>` : ''}
            ${l1Details && l1Details.process_name ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Process Name</strong></td><td style="padding: 10px 0; color: #1e293b;">${l1Details.process_name} ${l1Details.process_line ? `(Line: ${l1Details.process_line})` : ''}</td></tr>` : ''}
            ${l1Details && l1Details.machine_no ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Machine No</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${l1Details.machine_no}</td></tr>` : ''}
            ${l1Details && l1Details.description ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; vertical-align: top;"><strong>Description</strong></td><td style="padding: 10px 0; color: #475569; line-height: 1.5; font-size: 12.5px;">${l1Details.description}</td></tr>` : ''}
            ${notification.dept ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Target Department</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${notification.dept}</td></tr>` : ''}
          </table>
          <div style="text-align: center; margin: 30px 0 10px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: #0066cc; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              Access CMS Portal
            </a>
          </div>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            This is an automated notification from the Nippon QA 4M Change Management System.<br />
            Please do not reply directly to this email.
          </p>
        </div>
      `;
      
      const { sendMail } = await import('../config/email.js');
      for (const email of targetEmails) {
        await sendMail({
          to: email,
          subject: `[CMS] Alert: ${notification.title}`,
          html: emailContent,
          text: `${notification.title}\n\n${notification.details}${notification.changeNo ? `\nChange Reference: ${notification.changeNo}` : ''}`
        });
      }
    }
  } catch (error) {
    console.error('Error sending email for notification:', error);
  }
};

export const createNotification = async ({ id, title, details, changeNo, category, dept, timeStr, type, color }) => {
  await pool.query(
    `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
    [id, title, details, changeNo || '', category || '', dept || '', timeStr || 'Just now', type || 'Action Required', color || 'blue']
  );
  broadcast({ type: 'REFRESH_NOTIFICATIONS' });

  // Trigger email asynchronously
  sendEmailForNotification(id).catch(err => console.error('Error in createNotification email send:', err));

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
    broadcast({ type: 'REFRESH_NOTIFICATIONS' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
