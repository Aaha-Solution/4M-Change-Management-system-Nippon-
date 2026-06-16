import pool from '../config/db.js';
import { sendMail } from '../config/email.js';

/**
 * Creates L2 validation-related database notifications based on status.
 */
export const createL2Notifications = async (connection, changeNo, status, logData, l1Dept, requestBy, crTitle, crRequesterEmail, crRequesterDept, changeIn, processName, machineNo) => {
  const { date, requester, weldTest, qaTest, remarks } = logData;
  
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} Today`;

  let targetUsers = [];
  let title = '';
  let details = '';
  let statusColor = 'blue';

  if (status === 'Pending') {
    const [rows] = await connection.query(
      `SELECT email, name, department, role FROM users 
       WHERE department != '' AND department IS NOT NULL 
         AND (
           LOWER(department) IN ('quality', 'qad', 'qa', 'general') 
           OR LOWER(role) IN ('admin', 'administrator')
           OR (
             LOWER(department) = LOWER(?)
              AND (LOWER(role) LIKE '%hod%' OR LOWER(role) LIKE '%manager%')
           )
         )`,
      [l1Dept || '']
    );
    targetUsers = rows.filter(u => u.email.toLowerCase() !== (crRequesterEmail || '').toLowerCase());
    title = `L2 Setup Validation Awaiting QA Review – ${changeNo}`;
    details = `Change Request ${changeNo} ("${crTitle}")${changeIn ? ` (${changeIn})` : ''} has updated L2 requester validation attachment by ${requestBy}. QA Setup Verification review is now required.`;
    statusColor = 'blue';
  } else if (status === 'Accepted') {
    const seenEmails = new Set();

    // 1. Requester
    if (crRequesterEmail) {
      const [requesterDetails] = await connection.query(
        `SELECT email, name, department, role FROM users WHERE email = ?`,
        [crRequesterEmail]
      );
      if (requesterDetails.length > 0) {
        const u = requesterDetails[0];
        if (!seenEmails.has(u.email.toLowerCase())) {
          seenEmails.add(u.email.toLowerCase());
          targetUsers.push(u);
        }
      } else if (!seenEmails.has(crRequesterEmail.toLowerCase())) {
        seenEmails.add(crRequesterEmail.toLowerCase());
        targetUsers.push({
          email: crRequesterEmail,
          name: requester || 'Requester',
          department: crRequesterDept || 'General',
          role: 'User'
        });
      }
    }

    // 2. Admins
    const [admins] = await connection.query(
      `SELECT email, name, department, role FROM users 
       WHERE LOWER(role) IN ('admin', 'administrator')`
    );
    for (const u of admins) {
      if (!seenEmails.has(u.email.toLowerCase())) {
        seenEmails.add(u.email.toLowerCase());
        targetUsers.push(u);
      }
    }

    // 3. All Department HODs
    const [hods] = await connection.query(
      `SELECT email, name, department, role FROM users 
       WHERE department != '' AND department IS NOT NULL AND (LOWER(role) LIKE '%hod%' OR LOWER(role) LIKE '%manager%')`
    );
    for (const u of hods) {
      if (!seenEmails.has(u.email.toLowerCase())) {
        seenEmails.add(u.email.toLowerCase());
        targetUsers.push(u);
      }
    }

    title = `L2 Validation Accepted – ${changeNo}`;
    details = `Change Request ${changeNo} ("${crTitle}")${changeIn ? ` (${changeIn})` : ''} has been accepted at L2 validation by ${requestBy}.${processName ? ` Process: ${processName}.` : ''}${machineNo ? ` Machine: ${machineNo}.` : ''}${remarks ? ` Remarks: ${remarks}` : ''} L3 review is now required.`;
    statusColor = 'green';
  } else if (status === 'Rejected') {
    const [rows] = await connection.query(
      `SELECT email, name, department, role FROM users 
       WHERE department != '' AND department IS NOT NULL 
         AND (
           LOWER(department) IN ('quality', 'qad', 'qa') 
           OR LOWER(role) IN ('admin', 'administrator') 
           OR LOWER(email) = LOWER(?)
         )`,
      [crRequesterEmail || '']
    );
    targetUsers = rows;
    title = `L2 Validation Rejected – ${changeNo}`;
    details = `Change Request ${changeNo} ("${crTitle}")${changeIn ? ` (${changeIn})` : ''} has been rejected at L2 validation by Quality.${processName ? ` Process: ${processName}.` : ''}${machineNo ? ` Machine: ${machineNo}.` : ''}${remarks ? ` Remarks: ${remarks}` : ''}`;
    statusColor = 'red';
  }

  // Insert Database Notifications
  const seenNotifEmails = new Set();
  for (const targetUser of targetUsers) {
    const email = targetUser.email;
    if (!email || seenNotifEmails.has(email.toLowerCase())) continue;
    seenNotifEmails.add(email.toLowerCase());

    const dept = targetUser.department || 'General';
    const deptLower = dept.toLowerCase();
    const l1DeptLower = (l1Dept || '').toLowerCase();
    const isL1DeptHODOnly = status === 'Pending' && deptLower === l1DeptLower && !['quality', 'qad', 'qa', 'general'].includes(deptLower);

    let notifId = '';
    if (status === 'Accepted') {
      notifId = `L2-NOTIF-ACCEPTED-${changeNo}-${email.replace(/[@.]/g, '_')}-${Date.now()}`;
    } else {
      notifId = isL1DeptHODOnly
        ? `L1-HOD-NOTIF-L2-${changeNo}-${email.replace(/[@.]/g, '_')}-${Date.now()}`
        : `L2-NOTIF-${changeNo}-${email.replace(/[@.]/g, '_')}-${Date.now()}`;
    }

    await connection.query(
      `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)`,
      [notifId, title, details, changeNo, changeIn || 'GENERAL', dept, timeStr, 'Action Required', statusColor, email]
    );
  }

  // Send personal confirmation notification to the requester when they submit their PED validation
  if (status === 'Pending' && crRequesterEmail) {
    const [reqUserDeptRow] = await connection.query(
      `SELECT department FROM users WHERE email = ?`,
      [crRequesterEmail]
    );
    const reqDept = reqUserDeptRow.length > 0 ? reqUserDeptRow[0].department : '';
    if (reqDept) {
      const requesterNotifId = `L2-REQUESTER-CONFIRM-${changeNo}-${Date.now()}`;
      const requesterNotifTitle = `L2 Validation Submitted – ${changeNo}`;
      const requesterNotifDetails = `Your L2 Requester Validation attachment for Change Request ${changeNo} ("${crTitle}")${changeIn ? ` (${changeIn})` : ''} has been submitted successfully. The QA department will now review and verify your setup. You will be notified once a decision is made.`;
      await connection.query(
        `INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color, recipient_email)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?)`,
        [requesterNotifId, requesterNotifTitle, requesterNotifDetails, changeNo, changeIn || 'GENERAL', reqDept, timeStr, 'Info', 'blue', crRequesterEmail]
      );
    }
  }

  return targetUsers;
};

/**
 * Sends email notifications for the L2 validation step.
 */
export const sendL2Emails = async (changeNo, status, logData, l1Dept, requestBy, crRequesterEmail, crRequesterDept, crTitle, changeIn, processName, machineNo, resolvedTargetUsers) => {
  try {
    const { remarks } = logData;
    let users = [];

    if (status === 'Pending') {
      const [rows] = await pool.query(
        `SELECT email, name, department, role FROM users 
         WHERE department != '' AND department IS NOT NULL 
           AND (
             LOWER(department) IN ('quality', 'qad', 'qa') 
             OR LOWER(role) IN ('admin', 'administrator')
             OR (
               LOWER(department) = LOWER(?)
                AND (LOWER(role) LIKE '%hod%' OR LOWER(role) LIKE '%manager%')
             )
           )`,
        [l1Dept || '']
      );
      users = rows.filter(u => u.email.toLowerCase() !== (crRequesterEmail || '').toLowerCase());

      // Also send a confirmation email to the requester themselves
      if (crRequesterEmail) {
        const [reqNameRow] = await pool.query(
          `SELECT name FROM users WHERE LOWER(email) = LOWER(?)`,
          [crRequesterEmail]
        );
        const reqName = reqNameRow.length > 0 ? reqNameRow[0].name : requestBy;
        const confirmHtml = `
          <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background-color: #0066cc; color: white; padding: 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Change Management System</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">L2 Validation Submission Confirmation</p>
            </div>
            <div style="padding: 24px; background-color: #ffffff;">
              <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Hello ${reqName},</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                Your <strong>L2 Requester Validation attachment</strong> has been submitted successfully and is now <strong>awaiting QA Setup Verification</strong>.
              </p>
              <div style="background-color: #f0f9ff; border-left: 4px solid #0066cc; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">Submission Status</div>
                <div style="font-size: 18px; font-weight: 700; color: #0066cc; margin-top: 2px;">Pending QA Review</div>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; color: #475569;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 35%;">Change Request #</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
                ${crTitle ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Title</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${crTitle}</td></tr>` : ''}
                ${changeIn ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Change Category</td><td style="padding: 10px 0; color: #1e293b;">${changeIn}</td></tr>` : ''}
                ${processName ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Process Name</td><td style="padding: 10px 0; color: #1e293b;">${processName}</td></tr>` : ''}
                ${machineNo ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Machine No</td><td style="padding: 10px 0; color: #1e293b; font-family: monospace;">${machineNo}</td></tr>` : ''}
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Submitted By</td><td style="padding: 10px 0; color: #1e293b;">${requestBy}</td></tr>
              </table>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6;">
                The QA department has been notified and will review your submission. You will receive another notification once a decision (Accepted / Rejected) is made.
              </p>
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
        await sendMail({
          to: crRequesterEmail,
          subject: `[4M CMS] Submission Confirmed: L2 Requester Validation for ${changeNo}`,
          html: confirmHtml
        });
      }
    } else if (status === 'Accepted') {
      users = resolvedTargetUsers || [];
    } else if (status === 'Rejected') {
      const [rows] = await pool.query(
        `SELECT email, name, department, role FROM users 
         WHERE department != '' AND department IS NOT NULL 
           AND (LOWER(department) IN ('quality', 'qad', 'qa') 
                OR LOWER(role) IN ('admin', 'administrator') 
                OR LOWER(email) = LOWER(?))`,
        [crRequesterEmail || '']
      );
      users = rows;
    }

    if (users && users.length > 0) {
      const themeColor = status === 'Accepted' ? '#10b981' : (status === 'Rejected' ? '#ef4444' : '#0066cc');
      const bgLight = status === 'Accepted' ? '#f0fdf4' : (status === 'Rejected' ? '#fef2f2' : '#f0f9ff');
      const statusLabel = status === 'Accepted' ? 'Accepted' : (status === 'Rejected' ? 'Rejected' : 'Pending QA Review');

      let emailSubject = `[4M CMS] Action Required: L3 Review for ${changeNo}`;
      let emailIntro = `A change request has been evaluated at <strong>L2 Validation</strong> and is now pending your department's review at <strong>L3</strong>.`;
      let headerSubtitle = 'L2 Validation Alert';

      if (status === 'Pending') {
        emailSubject = `[4M CMS] Action Required: QA Setup Verification for ${changeNo}`;
        emailIntro = `A change request has updated <strong>L2 Requester Validation documentation</strong> and is now pending your setup verification review.`;
        headerSubtitle = 'L2 Validation Alert';
      } else if (status === 'Accepted') {
        emailSubject = `[4M CMS] L2 Validation Approved for Request: ${changeNo}`;
        emailIntro = `Change Request <strong>${changeNo}</strong> has successfully completed and been <strong>Approved</strong> at L2 setup validation. L3 department reviews are now required.`;
        headerSubtitle = 'L2 Validation Approved';
      } else if (status === 'Rejected') {
        emailSubject = `[4M CMS] Alert: L2 Validation Rejected for ${changeNo}`;
        emailIntro = `A change request L2 validation has been <strong>rejected</strong> by the Quality department.`;
        headerSubtitle = 'L2 Validation Rejected';
      }

      const recipientEmails = [...new Set(users.map(u => u.email).filter(Boolean))];

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background-color: ${themeColor}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Change Management System</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">${headerSubtitle}</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <h2 style="margin-top: 0; color: #1e293b; font-size: 18px;">Hello Team,</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">
              ${emailIntro}
            </p>
            <div style="background-color: ${bgLight}; border-left: 4px solid ${themeColor}; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">Validation Status</div>
              <div style="font-size: 18px; font-weight: 700; color: ${themeColor}; margin-top: 2px;">L2 Status: ${statusLabel}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; color: #475569;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; width: 35%;">Change Request #</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-family: monospace;">${changeNo}</td></tr>
              ${crTitle ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Title</td><td style="padding: 10px 0; color: #1e293b; font-weight: 600;">${crTitle}</td></tr>` : ''}
              ${changeIn ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Change Category</td><td style="padding: 10px 0; color: #1e293b;">${changeIn}</td></tr>` : ''}
              ${processName ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Process Name</td><td style="padding: 10px 0; color: #1e293b;">${processName}</td></tr>` : ''}
              ${machineNo ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Machine No</td><td style="padding: 10px 0; color: #1e293b; font-family: monospace;">${machineNo}</td></tr>` : ''}
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b;">Change Requested By</td><td style="padding: 10px 0; color: #1e293b;">${requestBy} ${l1Dept ? `(${l1Dept})` : ''}</td></tr>
              ${remarks ? `<tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 0; color: #64748b; vertical-align: top;">Remarks</td><td style="padding: 10px 0; color: #475569; line-height: 1.5;">${remarks}</td></tr>` : ''}
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

      if (recipientEmails.length > 0) {
        await sendMail({ to: recipientEmails.join(', '), subject: emailSubject, html: emailHtml });
      }
    }
  } catch (err) {
    console.error('Error sending L2 email notifications:', err);
  }
};
