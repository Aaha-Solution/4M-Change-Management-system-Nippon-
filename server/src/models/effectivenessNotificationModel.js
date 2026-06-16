import pool from '../config/db.js';
import { sendMail } from '../config/email.js';
import { broadcast } from '../config/websocket.js';

/**
 * Sends DB notifications and emails to requester, all HODs, and admins
 * when QA effectiveness evaluation is decided (Approved or Rejected).
 */
export const triggerEffectivenessQAAlert = async (changeNo, qaApproval, remarks) => {
  try {
    // 1. Fetch requester email and change request details
    const [crRows] = await pool.query(
      `SELECT cr.id, cr.title, cr.requester as requesterEmail, 
              COALESCE(l1.request_by, u.name, cr.requester) as requesterName,
              COALESCE(l1.dept, u.department) as dept, l1.process_name as processName, l1.machine_no as machineNo
       FROM change_requests cr
       LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
       LEFT JOIN users u ON cr.requester = u.email
       WHERE cr.id = ?`,
      [changeNo]
    );

    if (crRows.length === 0) return;
    const cr = crRows[0];

    // 2. Fetch all users to find HODs and Admins
    const [users] = await pool.query('SELECT email, role, department FROM users');

    const recipientEmails = new Set();
    // Add requester
    if (cr.requesterEmail) {
      recipientEmails.add(cr.requesterEmail.toLowerCase());
    }

    // Add HODs and Admins
    for (const user of users) {
      const role = (user.role || '').toLowerCase();
      const isAdmin = role.includes('admin') || role.includes('administrator');
      const isHOD = role.includes('hod') || role.includes('manager') || 
                    role.includes('unit head') || role.includes('unit_head');
      if (isAdmin || isHOD) {
        recipientEmails.add(user.email.toLowerCase());
      }
    }

    const isApproved = qaApproval === 'Approved';
    const color = isApproved ? 'green' : 'red';
    const headerBg = isApproved ? '#16a34a' : '#dc2626';
    const borderLeftColor = isApproved ? '#16a34a' : '#dc2626';
    const remarksTextColor = isApproved ? '#15803d' : '#991b1b';
    const remarksBg = isApproved ? '#f0fdf4' : '#fef2f2';

    // 3. Create a notification in the DB for each target user specifically (no department broadcast)
    const title = `Effectiveness QA ${qaApproval} – ${changeNo}`;
    const details = `The effectiveness monitoring observations for Change Request ${changeNo} have been ${qaApproval} by QA HOD. Remarks: ${remarks}`;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;

    for (const email of recipientEmails) {
      const personalNotifId = `EFF-QA-${qaApproval.toUpperCase()}-${changeNo}-${email.replace(/[@.]/g, '_')}-${Date.now()}`;
      await pool.query(
        `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
         VALUES (?, ?, ?, ?, 'SYSTEM', '', ?, FALSE, 'Action Required', ?, ?)`,
        [personalNotifId, title, details, changeNo, timeStr, color, email]
      );
    }

    broadcast({ type: 'REFRESH_NOTIFICATIONS' });

    // 4. Send email notification to all recipients (using BCC to save SMTP requests)
    const emailContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background-color: #ffffff;">
        <div style="background-color: ${headerBg}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -24px -24px 20px -24px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">4M Change Management System</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; tracking-wider: 1px;">Effectiveness Evaluation ${qaApproval.toUpperCase()}</p>
        </div>
        <p style="font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">Alert: Effectiveness Evaluation ${qaApproval} by QA HOD</p>
        <div style="background-color: ${remarksBg}; border-left: 4px solid ${borderLeftColor}; padding: 16px; margin: 20px 0; font-size: 14px; color: ${remarksTextColor}; line-height: 1.6; border-radius: 4px;">
          <strong>QA Decision Comments / Remarks:</strong><br />
          ${remarks}
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #475569;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 30%;"><strong>Change Request #</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
          ${cr.title ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Title</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${cr.title}</td></tr>` : ''}
          ${cr.requesterName ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Requested By</strong></td><td style="padding: 10px 0; color: #1e293b;">${cr.requesterName} ${cr.dept ? `(${cr.dept})` : ''}</td></tr>` : ''}
          ${cr.processName ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Process Name</strong></td><td style="padding: 10px 0; color: #1e293b;">${cr.processName}</td></tr>` : ''}
          ${cr.machineNo ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Machine No</strong></td><td style="padding: 10px 0; color: #1e293b; font-family: monospace;">${cr.machineNo}</td></tr>` : ''}
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>QA Decision</strong></td><td style="padding: 10px 0; color: ${headerBg}; font-weight: bold;">${qaApproval.toUpperCase()}</td></tr>
        </table>
        <div style="text-align: center; margin: 30px 0 10px 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: ${headerBg}; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
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

    const emailList = [...recipientEmails].filter(Boolean);
    if (emailList.length > 0) {
      await sendMail({
        to: emailList[0],
        bcc: emailList.slice(1).join(', '),
        subject: `[CMS Alert] Effectiveness Evaluation ${qaApproval.toUpperCase()} - ${changeNo}`,
        html: emailContent,
        text: `Effectiveness Evaluation ${qaApproval} for Change Request ${changeNo}\n\nQA Comments: ${remarks}`
      });
    }
  } catch (error) {
    console.error('Error triggering effectiveness QA alert:', error);
  }
};
