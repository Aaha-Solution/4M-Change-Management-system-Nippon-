import pool from '../config/db.js';
import { sendMail } from '../config/email.js';
import { broadcast } from '../config/websocket.js';

export const getL2ValidationLogs = async () => {
  const [rows] = await pool.query(
    `SELECT v.change_no as changeNo, v.validation_date as date, 
            COALESCE(l1.request_by, u.name, v.requester) as requester, 
            v.weld_test as weldTest, v.qa_test as qaTest, v.status, v.remarks,
            c.requester as requesterEmail
     FROM l2_validation_logs v
     LEFT JOIN l1_requests l1 ON v.change_no = l1.change_no
     LEFT JOIN change_requests c ON v.change_no = c.id
     LEFT JOIN users u ON c.requester = u.email
     ORDER BY v.created_at DESC`
  );
  return rows;
};

export const addL2ValidationLog = async (logData, attachments) => {
  const { changeNo, date, requester, weldTest, qaTest, status, remarks } = logData;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingL2] = await connection.query(
      `SELECT status FROM l2_validation_logs WHERE change_no = ?`,
      [changeNo]
    );

    if (existingL2.length > 0) {
      if (status === 'Accepted') {
        await connection.query(
          `UPDATE change_requests SET status = 'Approved' WHERE id = ?`,
          [changeNo]
        );
      } else if (status === 'Rejected') {
        await connection.query(
          `UPDATE change_requests SET status = 'Evaluating' WHERE id = ?`,
          [changeNo]
        );
      }

      await connection.query(
        `UPDATE l2_validation_logs 
         SET validation_date = ?, 
             requester = ?, 
             weld_test = COALESCE(NULLIF(?, ''), weld_test), 
             qa_test = COALESCE(NULLIF(?, ''), qa_test), 
             status = COALESCE(NULLIF(?, ''), status), 
             remarks = COALESCE(NULLIF(?, ''), remarks)
         WHERE change_no = ?`,
        [date, requester, weldTest || '', qaTest || '', status || '', remarks || '', changeNo]
      );
    } else {
      const [existing] = await connection.query(
        `SELECT id FROM change_requests WHERE id = ?`,
        [changeNo]
      );
      if (existing.length === 0) {
        await connection.query(
          `INSERT INTO change_requests (id, title, requester, date, priority, status) 
           VALUES (?, ?, ?, CURDATE(), 'Medium', ?)`,
          [changeNo, `[L2 Auto] Validation for ${changeNo}`, 'admin@cms.com', status === 'Accepted' ? 'Approved' : 'Pending']
        );
      } else if (status === 'Accepted') {
        await connection.query(
          `UPDATE change_requests SET status = 'Approved' WHERE id = ?`,
          [changeNo]
        );
      } else if (status === 'Rejected') {
        await connection.query(
          `UPDATE change_requests SET status = 'Evaluating' WHERE id = ?`,
          [changeNo]
        );
      }

      await connection.query(
        `INSERT INTO l2_validation_logs (change_no, validation_date, requester, weld_test, qa_test, status, remarks) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [changeNo, date, requester, weldTest || '', qaTest || '', status || 'Pending', remarks || '']
      );
    }

    // Save L2 attachments — bulk delete per field then insert all
    if (attachments && attachments.length > 0) {
      const fieldNames = [...new Set(attachments.map(f => f.fieldName))];
      for (const fieldName of fieldNames) {
        await connection.query(
          `DELETE FROM l2_attachments WHERE change_no = ? AND field_name = ?`,
          [changeNo, fieldName]
        );
      }
      for (const file of attachments) {
        await connection.query(
          `INSERT INTO l2_attachments (change_no, field_name, file_name, file_data, file_type) 
           VALUES (?, ?, ?, ?, ?)`,
          [changeNo, file.fieldName, file.name, file.data, file.type]
        );
      }
    }

    // Create notifications for all other departments
    const [l1Rows] = await connection.query(
      `SELECT dept, change_in, request_by, process_name, machine_no FROM l1_requests WHERE change_no = ?`,
      [changeNo]
    );
    const l1Dept = l1Rows.length > 0 ? l1Rows[0].dept : '';
    const changeIn = l1Rows.length > 0 ? l1Rows[0].change_in : '';
    const requestBy = l1Rows.length > 0 ? l1Rows[0].request_by : requester;
    const processName = l1Rows.length > 0 ? l1Rows[0].process_name : '';
    const machineNo = l1Rows.length > 0 ? l1Rows[0].machine_no : '';

    const [deptRows] = await connection.query(
      `SELECT DISTINCT department FROM users WHERE department != '' AND department IS NOT NULL AND LOWER(department) != LOWER(?)`,
      [l1Dept || '']
    );

    const statusLabel = status === 'Accepted' ? 'Accepted' : 'Rejected';
    const statusColor = status === 'Accepted' ? 'green' : 'red';
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;

    for (const deptRow of deptRows) {
      const dept = deptRow.department;
      const notifId = `L2-NOTIF-${changeNo}-${dept.replace(/\s+/g, '_')}-${Date.now()}`;
      const title = `L2 Validation ${statusLabel} – ${changeNo}`;
      const details = `Change Request ${changeNo}${changeIn ? ` (${changeIn})` : ''} has been ${statusLabel.toLowerCase()} at L2 validation by ${requestBy}.${processName ? ` Process: ${processName}.` : ''}${machineNo ? ` Machine: ${machineNo}.` : ''}${remarks ? ` Remarks: ${remarks}` : ''} Your department (${dept}) review is now required at L3.`;
      await connection.query(
        `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
        [notifId, title, details, changeNo, changeIn || 'GENERAL', dept, timeStr, 'Action Required', statusColor]
      );
    }

    await connection.commit();
    broadcast({ type: 'REFRESH_CHANGES' });
    broadcast({ type: 'REFRESH_NOTIFICATIONS' });

    // Send emails asynchronously after commit
    (async () => {
      try {
        const [users] = await pool.query(
          `SELECT email, name, department FROM users WHERE department != '' AND department IS NOT NULL AND LOWER(department) != LOWER(?)`,
          [l1Dept || '']
        );
        if (users && users.length > 0) {
          const themeColor = status === 'Accepted' ? '#10b981' : '#ef4444';
          const bgLight = status === 'Accepted' ? '#f0fdf4' : '#fef2f2';
          for (const user of users) {
            const emailSubject = `[4M CMS] Action Required: L3 Review for ${changeNo}`;
            const emailHtml = `
              <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: ${themeColor}; color: white; padding: 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Change Management System</h1>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">L2 Validation Alert</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                  <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Hello ${user.name || 'User'},</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    A change request has been evaluated at <strong>L2 Validation</strong> and is now pending your department's review at <strong>L3</strong>.
                  </p>
                  <div style="background-color: ${bgLight}; border-left: 4px solid ${themeColor}; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">Validation Status</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${themeColor}; margin-top: 2px;">L2 Status: ${statusLabel}</div>
                  </div>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 35%;">Change Request #</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${changeNo}</td></tr>
                    ${changeIn ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Change Category</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${changeIn}</td></tr>` : ''}
                    ${processName ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Process Name</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${processName}</td></tr>` : ''}
                    ${machineNo ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Machine No</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${machineNo}</td></tr>` : ''}
                    <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">L2 Evaluated By</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${requestBy}</td></tr>
                    <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Target Department</td><td style="padding: 8px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${user.department}</td></tr>
                    ${remarks ? `<tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">Remarks</td><td style="padding: 8px 0; color: #475569; font-size: 13px;">${remarks}</td></tr>` : ''}
                  </table>
                  <div style="text-align: center; margin: 32px 0 12px 0;">
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: #0066cc; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                      Go to Dashboard
                    </a>
                  </div>
                </div>
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                  This is an automated notification from the 4M Change Management System.
                </div>
              </div>
            `;
            await sendMail({ to: user.email, subject: emailSubject, html: emailHtml });
          }
        }
      } catch (err) {
        console.error('Error sending email notifications after L2 commit:', err);
      }
    })();

    return logData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getL2Details = async (changeNo) => {
  const [rows] = await pool.query(
    `SELECT v.change_no as changeNo, v.validation_date as date, 
            COALESCE(l1.request_by, u.name, v.requester) as requester, 
            v.weld_test as weldTest, v.qa_test as qaTest, v.status, v.remarks 
     FROM l2_validation_logs v
     LEFT JOIN l1_requests l1 ON v.change_no = l1.change_no
     LEFT JOIN change_requests c ON v.change_no = c.id
     LEFT JOIN users u ON c.requester = u.email
     WHERE v.change_no = ?`,
    [changeNo]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const getL2Attachment = async (changeNo, fileName) => {
  const [rows] = await pool.query(
    `SELECT file_name as name, file_data as data, file_type as type 
     FROM l2_attachments 
     WHERE change_no = ? AND file_name = ?`,
    [changeNo, fileName]
  );
  return rows.length > 0 ? rows[0] : null;
};
