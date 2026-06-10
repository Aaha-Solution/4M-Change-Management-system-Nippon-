import pool from '../config/db.js';
import { sendMail } from '../config/email.js';

export const getChanges = async () => {
  // Self-healing: auto-complete any change requests that have all 9 L3 approvals set to 'Approved' or 'Rejected'
  try {
    await pool.query(`
      UPDATE change_requests cr
      INNER JOIN l3_approvals l3 ON cr.id = l3.change_no
      SET cr.status = 'Completed'
      WHERE l3.ped IN ('Approved', 'Rejected')
        AND l3.quality IN ('Approved', 'Rejected')
        AND l3.production IN ('Approved', 'Rejected')
        AND l3.maintenance IN ('Approved', 'Rejected')
        AND l3.pcl IN ('Approved', 'Rejected')
        AND l3.materials IN ('Approved', 'Rejected')
        AND l3.marketing IN ('Approved', 'Rejected')
        AND l3.hr IN ('Approved', 'Rejected')
        AND l3.safety IN ('Approved', 'Rejected')
        AND cr.status != 'Completed'
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
                  AND l3.safety = 'Approved' THEN 1 ELSE 0 END as isL3Approved
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
  return { id, status };
};

const formatDateToSql = (dateStr) => {
  if (!dateStr) return null;
  // If it's already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Try dd/mm/yyyy parsing
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
};

export const addL1Request = async (l1Data, attachments, userEmail) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      changeNo,
      unit,
      requestedTime,
      changeIn,
      dept,
      requestBy,
      processName,
      processLine,
      machineNo,
      context,
      description,
      improvementArea,
      changeType,
      dateStart,
      traceFrom,
      dateClose,
      traceTo,
      riskAnalysis,
      sopUpdate,
      hodApproval,
      customerApproval,
      effectivenessMonitoring,
      fileDesc,
      fileImprovement,
      fileTraceFrom,
      fileTraceTo,
      fileRisk,
      fileSop,
      fileEffectiveness
    } = l1Data;

    const status = 'Pending';
    const priority = 'High';
    const title = `[L1 Request - ${changeIn || 'General'}] ${context}`;

    await connection.query(
      'INSERT INTO change_requests (id, title, requester, date, priority, status) VALUES (?, ?, ?, CURDATE(), ?, ?)',
      [changeNo, title, userEmail, priority, status]
    );

    await connection.query(
      `INSERT INTO l1_requests (
        change_no, unit, requested_time, change_in, dept, request_by, 
        process_name, process_line, machine_no, description, 
        improvement_area, change_type, date_start, trace_from, 
        date_close, trace_to, risk_analysis, sop_update, 
        hod_approval, customer_approval, effectiveness_monitoring,
        file_desc, file_improvement, file_trace_from, file_trace_to,
        file_risk, file_sop, file_effectiveness
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        changeNo, unit, requestedTime, changeIn || '', dept, requestBy,
        processName, processLine, machineNo, description,
        improvementArea, changeType, formatDateToSql(dateStart), traceFrom,
        formatDateToSql(dateClose), traceTo, riskAnalysis, sopUpdate,
        hodApproval, customerApproval, effectivenessMonitoring,
        fileDesc || '', fileImprovement || '', fileTraceFrom || '', fileTraceTo || '',
        fileRisk || '', fileSop || '', fileEffectiveness || ''
      ]
    );

    // Save L1 attachments if any
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        await connection.query(
          `INSERT INTO l1_attachments (change_no, field_name, file_name, file_data, file_type) 
           VALUES (?, ?, ?, ?, ?)`,
          [changeNo, file.fieldName, file.name, file.data, file.type]
        );
      }
    }

    await connection.commit();
    return {
      id: changeNo,
      title,
      requester: userEmail,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      priority,
      status
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

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
      throw new Error(`L2 validation log already exists for change request ${changeNo} and cannot be updated.`);
    }

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
      [changeNo, date, requester, weldTest || '', qaTest || '', status, remarks]
    );

    // Save L2 attachments if any
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        // Delete previous attachment for this field before inserting new one
        await connection.query(
          `DELETE FROM l2_attachments WHERE change_no = ? AND field_name = ?`,
          [changeNo, file.fieldName]
        );
        await connection.query(
          `INSERT INTO l2_attachments (change_no, field_name, file_name, file_data, file_type) 
           VALUES (?, ?, ?, ?, ?)`,
          [changeNo, file.fieldName, file.name, file.data, file.type]
        );
      }
    }

    // --- Create notifications for other department people ---
    // Get the L1 request details for context
    const [l1Rows] = await connection.query(
      `SELECT dept, change_in, request_by, process_name, machine_no FROM l1_requests WHERE change_no = ?`,
      [changeNo]
    );

    const l1Dept = l1Rows.length > 0 ? l1Rows[0].dept : '';
    const changeIn = l1Rows.length > 0 ? l1Rows[0].change_in : '';
    const requestBy = l1Rows.length > 0 ? l1Rows[0].request_by : requester;
    const processName = l1Rows.length > 0 ? l1Rows[0].process_name : '';
    const machineNo = l1Rows.length > 0 ? l1Rows[0].machine_no : '';

    // Get all distinct departments from users (excluding the requester's own department)
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

    // Trigger emails asynchronously after transaction is committed
    (async () => {
      try {
        const [users] = await pool.query(
          `SELECT email, name, department FROM users WHERE department != '' AND department IS NOT NULL AND LOWER(department) != LOWER(?)`,
          [l1Dept || '']
        );

        if (users && users.length > 0) {
          const statusLabel = status === 'Accepted' ? 'Accepted' : 'Rejected';
          const themeColor = status === 'Accepted' ? '#10b981' : '#ef4444';
          const bgLight = status === 'Accepted' ? '#f0fdf4' : '#fef2f2';

          for (const user of users) {
            const emailSubject = `[4M CMS] Action Required: L3 Review for ${changeNo}`;
            const emailHtml = `
              <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="background-color: ${themeColor}; color: white; padding: 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Change Management System</h1>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase;">L2 Validation Alert</p>
                </div>
                <div style="padding: 24px; background-color: #ffffff;">
                  <h2 style="margin-top: 0; color: #1e293b; font-size: 18px; font-weight: 600;">Hello ${user.name || 'User'},</h2>
                  <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    A change request has been evaluated at <strong>L2 Validation</strong> and is now pending your department's review at <strong>L3</strong>.
                  </p>
                  <div style="background-color: ${bgLight}; border-left: 4px solid ${themeColor}; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <div style="font-size: 13px; text-transform: uppercase; color: #64748b; font-weight: 600;">Validation Status</div>
                    <div style="font-size: 18px; font-weight: 700; color: ${themeColor}; margin-top: 2px;">L2 Status: ${statusLabel}</div>
                  </div>
                  <h3 style="color: #334155; font-size: 14px; font-weight: 650; margin-bottom: 8px; border-bottom: 1px solid #edf2f7; padding-bottom: 6px;">Details of Change</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 35%;">Change Request #</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${changeNo}</td>
                    </tr>
                    ${changeIn ? `
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Change Category</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${changeIn}</td>
                    </tr>` : ''}
                    ${processName ? `
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Process Name</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${processName}</td>
                    </tr>` : ''}
                    ${machineNo ? `
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Machine No</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${machineNo}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">L2 Evaluated By</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${requestBy}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Target Department</td>
                      <td style="padding: 8px 0; color: #1e293b; font-size: 13px; font-weight: 600;">${user.department}</td>
                    </tr>
                    ${remarks ? `
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">Remarks</td>
                      <td style="padding: 8px 0; color: #475569; font-size: 13px; line-height: 1.4; background-color: #f8fafc; border-radius: 4px; padding-left: 8px; border-left: 2px solid #cbd5e1;">${remarks}</td>
                    </tr>` : ''}
                  </table>
                  <div style="text-align: center; margin: 32px 0 12px 0;">
                    <a href="${process.env.APP_URL || 'http://localhost:5173'}" style="background-color: #0066cc; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
                      Go to Dashboard
                    </a>
                  </div>
                </div>
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                  This is an automated notification from the 4M Change Management System. Please do not reply directly to this email.
                </div>
              </div>
            `;

            await sendMail({
              to: user.email,
              subject: emailSubject,
              html: emailHtml
            });
          }
        }
      } catch (err) {
        console.error('Error sending email notifications after transaction commit:', err);
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

export const getL3Approvals = async () => {
  const [rows] = await pool.query(
    `SELECT c.id as changeNo, 
            DATE_FORMAT(c.date, '%e %b') as date, 
            COALESCE(l1.request_by, u.name, c.requester) as requester,
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
            COALESCE(l.safety, 'Pending') as safety
     FROM change_requests c
     LEFT JOIN l1_requests l1 ON c.id = l1.change_no
     LEFT JOIN users u ON c.requester = u.email
     INNER JOIN l2_validation_logs v ON c.id = v.change_no
     LEFT JOIN l3_approvals l ON c.id = l.change_no
     ORDER BY c.created_at DESC`
  );
  return rows;
};

export const addL3ApprovalLog = async (logData) => {
  const { 
    changeNo, date, requester, 
    ped, quality, production, maintenance, pcl, materials, marketing, hr, safety 
  } = logData;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check if the change request exists. If not, auto-create it (similar to L2)
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

    await connection.query(
      `INSERT INTO l3_approvals (
        change_no, date, requester, ped, quality, production, 
        maintenance, pcl, materials, marketing, hr, safety
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        safety = VALUES(safety)`,
      [
        changeNo, date, requester, 
        ped || 'Pending', quality || 'Pending', production || 'Pending', 
        maintenance || 'Pending', pcl || 'Pending', materials || 'Pending', 
        marketing || 'Pending', hr || 'Pending', safety || 'Pending'
      ]
    );

    const allDecided = 
      ['Approved', 'Rejected'].includes(ped) &&
      ['Approved', 'Rejected'].includes(quality) &&
      ['Approved', 'Rejected'].includes(production) &&
      ['Approved', 'Rejected'].includes(maintenance) &&
      ['Approved', 'Rejected'].includes(pcl) &&
      ['Approved', 'Rejected'].includes(materials) &&
      ['Approved', 'Rejected'].includes(marketing) &&
      ['Approved', 'Rejected'].includes(hr) &&
      ['Approved', 'Rejected'].includes(safety);

    if (allDecided) {
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

    await connection.commit();
    return logData;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getNextChangeNo = async () => {
  const [rows] = await pool.query('SELECT id FROM change_requests');
  let maxNum = 0;
  for (const row of rows) {
    const match = row.id.match(/^4M-2026-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `4M-2026-${maxNum + 1}`;
};

export const getL1Details = async (changeNo) => {
  const [rows] = await pool.query(
    `SELECT cr.title, cr.requester as crRequester, DATE_FORMAT(cr.date, '%Y-%m-%d') as crDate, cr.priority, cr.status as crStatus,
            l1.*,
            DATE_FORMAT(l1.date_start, '%Y-%m-%d') as date_start,
            DATE_FORMAT(l1.date_close, '%Y-%m-%d') as date_close
     FROM change_requests cr
     LEFT JOIN l1_requests l1 ON cr.id = l1.change_no
     WHERE cr.id = ?`,
    [changeNo]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const getL1Attachment = async (changeNo, fileName) => {
  const [rows] = await pool.query(
    `SELECT file_name as name, file_data as data, file_type as type 
     FROM l1_attachments 
     WHERE change_no = ? AND file_name = ?`,
    [changeNo, fileName]
  );
  return rows.length > 0 ? rows[0] : null;
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




