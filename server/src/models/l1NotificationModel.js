import pool from '../config/db.js';
import { sendMail } from '../config/email.js';
import { broadcast } from '../config/websocket.js';

/**
 * Creates L1-specific HOD approval required notifications in the DB.
 */
export const createL1RequestNotifications = async (connection, changeNo, hodApproval, changeIn, requestBy, dept) => {
  const selectedDepts = hodApproval ? hodApproval.split(',').map(s => s.trim()).filter(Boolean) : [];
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;
  const notifIds = [];

  for (const dName of selectedDepts) {
    const notifId = `L1-HOD-NOTIF-${changeNo}-${dName.replace(/\s+/g, '_')}-${Date.now()}`;
    const notifTitle = `HOD Approval Required – ${changeNo}`;
    const notifDetails = `Change Request ${changeNo} created by ${requestBy} (${dept} department) requires HOD approval/validation (Approved or Rejected decision) from your department (${dName}).`;
    
    await connection.query(
      `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?)`,
      [notifId, notifTitle, notifDetails, changeNo, changeIn || 'GENERAL', dName, timeStr, 'Action Required', 'blue']
    );
    notifIds.push(notifId);
  }

  return notifIds;
};

/**
 * Sends email alerts to selected department HODs for the new L1 Change Request.
 */
export const sendL1RequestEmails = async (changeNo, hodApproval, changeIn, requestBy, dept) => {
  try {
    const selectedDepts = hodApproval ? hodApproval.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (selectedDepts.length === 0) return;

    // Fetch L1 details to populate the email table
    const [l1Rows] = await pool.query(
      `SELECT l1.change_no, l1.dept, l1.change_in, l1.request_by, l1.process_name, l1.process_line, l1.machine_no, l1.description, cr.title
       FROM l1_requests l1
       LEFT JOIN change_requests cr ON l1.change_no = cr.id
       WHERE l1.change_no = ?`,
      [changeNo]
    );
    if (l1Rows.length === 0) return;
    const l1Details = l1Rows[0];

    // Fetch all users to find target HODs
    const [users] = await pool.query('SELECT email, role, department FROM users');

    for (const dName of selectedDepts) {
      const targetEmails = [];
      const targetDeptLower = dName.toLowerCase();

      for (const user of users) {
        const userEmail = user.email;
        const userRole = (user.role || '').toLowerCase();
        const userDept = (user.department || '').toLowerCase();
        
        const isHOD = userRole.includes('hod') || userRole.includes('manager') || 
                      userRole.includes('unit head') || userRole.includes('unit_head');
        const isAdmin = userRole.includes('admin') || userRole.includes('administrator');
        
        if ((isHOD && userDept === targetDeptLower) || isAdmin) {
          targetEmails.push(userEmail);
        }
      }

      if (targetEmails.length > 0) {
        const emailContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); background-color: #ffffff;">
            <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; margin: -24px -24px 20px -24px;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">4M Change Management System</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; tracking-wider: 1px;">HOD Approval Request</p>
            </div>
            <p style="font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">HOD Approval Required – ${changeNo}</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #0066cc; padding: 16px; margin: 20px 0; font-size: 14px; color: #475569; line-height: 1.6; border-radius: 4px;">
              Change Request ${changeNo} created by ${requestBy} (${dept} department) requires HOD approval/validation decision from your department (${dName}).
            </div>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; color: #475569;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 30%;"><strong>Change Request #</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
              ${l1Details.title ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Title</strong></td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${l1Details.title}</td></tr>` : ''}
              ${l1Details.change_in ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Category</strong></td><td style="padding: 10px 0; color: #1e293b;">${l1Details.change_in}</td></tr>` : ''}
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Requested By</strong></td><td style="padding: 10px 0; color: #1e293b;">${l1Details.request_by} (${l1Details.dept})</td></tr>
              ${l1Details.process_name ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Process Name</strong></td><td style="padding: 10px 0; color: #1e293b;">${l1Details.process_name} ${l1Details.process_line ? `(Line: ${l1Details.process_line})` : ''}</td></tr>` : ''}
              ${l1Details.machine_no ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;"><strong>Machine No</strong></td><td style="padding: 10px 0; color: #1e293b; font-family: monospace;">${l1Details.machine_no}</td></tr>` : ''}
              ${l1Details.description ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; vertical-align: top;"><strong>Description</strong></td><td style="padding: 10px 0; color: #475569; line-height: 1.5; font-size: 12.5px;">${l1Details.description}</td></tr>` : ''}
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

        await sendMail({
          to: targetEmails[0],
          bcc: targetEmails.slice(1).join(', '),
          subject: `[CMS] Alert: HOD Approval Required for ${changeNo}`,
          html: emailContent
        });
      }
    }
  } catch (error) {
    console.error('Error sending L1 HOD emails:', error);
  }
};

/**
 * Creates L1 approval decision notifications in the DB.
 */
export const createL1DecisionNotifications = async (connection, changeNo, hodDept, status, remarks) => {
  // Fetch requester email to notify them
  const [crRows] = await connection.query(
    `SELECT cr.requester, COALESCE(l1.dept, u.department) as raisedDept, u.department as userDept, l1.change_in as changeIn
     FROM change_requests cr
     LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
     LEFT JOIN users u ON cr.requester = u.email
     WHERE cr.id = ?`,
    [changeNo]
  );

  const notifIds = [];

  if (crRows.length > 0) {
    const { requester, raisedDept, userDept, changeIn } = crRows[0];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;
    const notifId = `HOD-DECISION-${changeNo}-${hodDept.replace(/\s+/g, '_')}-${Date.now()}`;
    const color = status === 'Approved' ? 'green' : 'red';
    const title = `HOD ${status} – ${changeNo}`;
    const details = `Change Request ${changeNo}${changeIn ? ` (${changeIn})` : ''} has been ${status.toLowerCase()} by the ${hodDept} HOD.${remarks ? ` Remarks: ${remarks}` : ''}`;

    await connection.query(
      `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, 'System Logs', ?)`,
      [notifId, title, details, changeNo, changeIn || 'GENERAL', raisedDept || '', timeStr, color]
    );
    notifIds.push(notifId);

    // If approved, add an Action Required notification for the requester to fill L2
    if (status === 'Approved') {
      const actionNotifId = `L2-ACTION-${changeNo}-${Date.now()}`;
      const actionTitle = `L1 Approved - Proceed to L2 Validation`;
      const actionDetails = `Your Change Request ${changeNo} has been approved by the HOD. Please proceed to L2.`;
      await connection.query(
        `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, 'Action Required', 'blue', ?)`,
        [actionNotifId, actionTitle, actionDetails, changeNo, changeIn || 'GENERAL', userDept || raisedDept || '', timeStr, requester]
      );
      notifIds.push(actionNotifId);
    }
  }

  return { notifIds, crDetails: crRows[0] };
};

/**
 * Sends email alerts for the L1 HOD decision (Approval/Rejection).
 */
export const sendL1DecisionEmails = async (changeNo, hodDept, status, remarks, crDetails) => {
  try {
    if (!crDetails) return;
    const { requester, raisedDept, userDept, changeIn } = crDetails;

    // Retrieve L1 details
    const [l1Rows] = await pool.query(
      `SELECT cr.title, COALESCE(l1.request_by, u.name) as requesterName
       FROM change_requests cr
       LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
       LEFT JOIN users u ON cr.requester = u.email
       WHERE cr.id = ?`,
      [changeNo]
    );
    const crTitle = l1Rows.length > 0 ? l1Rows[0].title : '';
    const requesterName = l1Rows.length > 0 ? l1Rows[0].requesterName : 'Requester';

    // Find all users in the raised department or admin to notify about decision
    const [users] = await pool.query('SELECT email, role, department FROM users');
    const targetEmails = new Set();
    
    // Always email the requester
    if (requester) {
      targetEmails.add(requester);
    }

    const raisedDeptLower = (raisedDept || '').toLowerCase();
    for (const user of users) {
      const userEmail = user.email;
      const userRole = (user.role || '').toLowerCase();
      const userDept = (user.department || '').toLowerCase();
      
      const isAdmin = userRole.includes('admin') || userRole.includes('administrator');
      const isHOD = userRole.includes('hod') || userRole.includes('manager') || 
                    userRole.includes('unit head') || userRole.includes('unit_head');
      
      // Email admins and other users in the same department
      if (isAdmin || (userDept === raisedDeptLower && (isHOD || userEmail === requester))) {
        targetEmails.add(userEmail);
      }
    }

    const emailList = [...targetEmails].filter(Boolean);
    if (emailList.length === 0) return;

    const themeColor = status === 'Approved' ? '#10b981' : '#ef4444';
    const bgLight = status === 'Approved' ? '#f0fdf4' : '#fef2f2';

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background-color: ${themeColor}; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Change Management System</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">L1 Approval Decision</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff;">
          <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Hello ${requesterName},</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Your Change Request has been <strong>${status}</strong> by the <strong>${hodDept}</strong> HOD.
          </p>
          <div style="background-color: ${bgLight}; border-left: 4px solid ${themeColor}; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">Status Update</div>
            <div style="font-size: 18px; font-weight: 700; color: ${themeColor}; margin-top: 2px;">Decision: L1 ${status}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; color: #475569;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 35%;">Change Request #</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
            ${crTitle ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Title</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${crTitle}</td></tr>` : ''}
            ${changeIn ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Category</td><td style="padding: 10px 0; color: #1e293b;">${changeIn}</td></tr>` : ''}
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

    await sendMail({
      to: emailList[0],
      bcc: emailList.slice(1).join(', '),
      subject: `[4M CMS] L1 HOD Decision: ${status} for ${changeNo}`,
      html: emailHtml
    });
  } catch (error) {
    console.error('Error sending L1 HOD decision emails:', error);
  }
};
