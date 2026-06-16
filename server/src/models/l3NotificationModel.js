import pool from '../config/db.js';
import { sendMail } from '../config/email.js';
import { broadcast } from '../config/websocket.js';

/**
 * Creates L3 approval decision notifications in the database for all departments.
 */
export const createL3DecisionNotifications = async (connection, changeNo, updatedDeptField, newDecision, changeIn, requestBy, requester, l1Dept) => {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;
  const color = newDecision === 'Approved' ? 'green' : 'red';
  const notifIdsToSend = [];

  // Fetch ALL departments to notify every HOD
  const [allDeptRows] = await connection.query(
    `SELECT DISTINCT department FROM users WHERE department != '' AND department IS NOT NULL`
  );

  for (const deptRow of allDeptRows) {
    const dept = deptRow.department;
    const notifId = `L3-DECISION-NOTIF-${changeNo}-${dept.replace(/\s+/g, '_')}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const title = `L3 Approval ${newDecision} by ${updatedDeptField} HOD – ${changeNo}`;
    const details = `Change Request ${changeNo}${changeIn ? ` (${changeIn})` : ''} raised by ${requestBy} has been ${newDecision.toLowerCase()} by the ${updatedDeptField} HOD at L3. Your department (${dept}) is notified.`;

    await connection.query(
      `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, NULL)`,
      [notifId, title, details, changeNo, changeIn || 'GENERAL', dept, timeStr, 'System Logs', color]
    );
    notifIdsToSend.push(notifId);
  }

  // Also notify the originating dept if not already covered
  if (l1Dept && !allDeptRows.some(r => r.department === l1Dept)) {
    const notifId = `L3-DECISION-NOTIF-${changeNo}-${l1Dept.replace(/\s+/g, '_')}-${Date.now()}`;
    const title = `L3 Approval ${newDecision} by ${updatedDeptField} HOD – ${changeNo}`;
    const details = `Change Request ${changeNo}${changeIn ? ` (${changeIn})` : ''} has been ${newDecision.toLowerCase()} by the ${updatedDeptField} HOD.`;

    await connection.query(
      `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, NULL)`,
      [notifId, title, details, changeNo, changeIn || 'GENERAL', l1Dept, timeStr, 'System Logs', color]
    );
    notifIdsToSend.push(notifId);
  }

  return notifIdsToSend;
};

/**
 * Sends email notifications to requester, HODs, and admins when an L3 decision is made.
 */
export const sendL3DecisionEmails = async (changeNo, updatedDeptField, newDecision, remarks, requester) => {
  try {
    // 1. Fetch details of the L1 request
    const [crRows] = await pool.query(
      `SELECT l1.change_no, l1.dept, l1.change_in, l1.request_by, l1.process_name, cr.title
       FROM change_requests cr
       LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
       WHERE cr.id = ?`,
      [changeNo]
    );
    if (crRows.length === 0) return;
    const cr = crRows[0];

    // 2. Fetch target users (all department HODs and admins)
    const [users] = await pool.query('SELECT email, role, department FROM users');

    const recipientEmails = new Set();
    if (requester) recipientEmails.add(requester);

    for (const u of users) {
      const role = (u.role || '').toLowerCase();
      const isAdmin = role.includes('admin') || role.includes('administrator');
      const isHOD = role.includes('hod') || role.includes('manager');
      if (isAdmin || isHOD) {
        recipientEmails.add(u.email);
      }
    }

    const emailList = [...recipientEmails].filter(Boolean);
    if (emailList.length === 0) return;

    const themeColor = newDecision === 'Approved' ? '#10b981' : '#ef4444';
    const bgLight = newDecision === 'Approved' ? '#f0fdf4' : '#fef2f2';
    const emailSubject = `[4M CMS] L3 Decision Alert: Change Request ${changeNo} is ${newDecision}`;

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: ${themeColor}; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Change Management System</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">L3 HOD Review Decision</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Hello Team,</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            A decision has been submitted for Change Request <strong>${changeNo}</strong> by the <strong>${updatedDeptField}</strong> HOD at L3.
          </p>
          <div style="background-color: ${bgLight}; border-left: 4px solid ${themeColor}; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">L3 Approval status update</div>
            <div style="font-size: 18px; font-weight: 700; color: ${themeColor}; margin-top: 2px;">Decision: ${newDecision} by ${updatedDeptField}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; color: #475569;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 35%;">Change Request #</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
            ${cr.title ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Title</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${cr.title}</td></tr>` : ''}
            ${cr.change_in ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Category</td><td style="padding: 10px 0; color: #1e293b;">${cr.change_in}</td></tr>` : ''}
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Requested By</td><td style="padding: 10px 0; color: #1e293b;">${cr.request_by || 'Requester'} (${cr.dept || ''})</td></tr>
            ${remarks ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; vertical-align: top;">Remarks</td><td style="padding: 10px 0; color: #475569; line-height: 1.5;">${remarks}</td></tr>` : ''}
          </table>
          <div style="text-align: center; margin: 32px 0 12px 0;">
            <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: #0066cc; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              Access CMS Portal
            </a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          This is an automated notification from the 4M Change Management System.
        </div>
      </div>
    `;

    // Send single batched email using BCC
    await sendMail({
      to: emailList[0],
      bcc: emailList.slice(1).join(', '),
      subject: emailSubject,
      html: emailHtml
    });
  } catch (err) {
    console.error('Error sending L3 email decision alerts:', err);
  }
};
