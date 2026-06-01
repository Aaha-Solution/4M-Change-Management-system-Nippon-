import pool from '../config/db.js';

const parseToISODate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLogs = async () => {
  const [rows] = await pool.query(
    `SELECT id, change_no as changeNo, DATE_FORMAT(req_date, '%Y-%m-%d') as reqDate, context, 
     DATE_FORMAT(start_date, '%Y-%m-%d') as startDate, month_wise as monthWise, remarks, attachment, status, qa_approval as qaApproval 
     FROM effectiveness_logs 
     ORDER BY created_at DESC`
  );
  return rows;
};

export const createLog = async (logData, attachments) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { id, changeNo, reqDate, context, startDate, monthWise, remarks, attachment, status, qaApproval } = logData;
    
    const formattedReqDate = parseToISODate(reqDate) || reqDate;
    const formattedStartDate = parseToISODate(startDate) || startDate;
    
    await connection.query(
      `INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, changeNo, formattedReqDate, context, formattedStartDate, monthWise, remarks, attachment || '', status, qaApproval]
    );
    
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        await connection.query(
          `INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) 
           VALUES (?, ?, ?, ?)`,
          [id, file.name, file.data, file.type]
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

export const updateLog = async (id, logData, attachments) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const { monthWise, remarks, attachment, status, qaApproval } = logData;
    
    // 1. Update the log details
    await connection.query(
      `UPDATE effectiveness_logs 
       SET month_wise = ?, remarks = ?, attachment = ?, status = ?, qa_approval = ? 
       WHERE id = ?`,
      [monthWise, remarks, attachment || '', status, qaApproval, id]
    );
    
    // 2. Delete any attachments that are no longer in the updated attachment list
    const currentAttachments = attachment ? attachment.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentAttachments.length > 0) {
      await connection.query(
        `DELETE FROM effectiveness_attachments 
         WHERE log_id = ? AND file_name NOT IN (?)`,
        [id, currentAttachments]
      );
    } else {
      await connection.query(
        `DELETE FROM effectiveness_attachments WHERE log_id = ?`,
        [id]
      );
    }
    
    // 3. Insert new attachments
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        await connection.query(
          `INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) 
           VALUES (?, ?, ?, ?) 
           ON DUPLICATE KEY UPDATE file_data = ?, file_type = ?`,
          [id, file.name, file.data, file.type, file.data, file.type]
        );
      }
    }
    
    await connection.commit();
    
    const [rows] = await connection.query(
      `SELECT id, change_no as changeNo, DATE_FORMAT(req_date, '%Y-%m-%d') as reqDate, context, 
       DATE_FORMAT(start_date, '%Y-%m-%d') as startDate, month_wise as monthWise, remarks, attachment, status, qa_approval as qaApproval 
       FROM effectiveness_logs 
       WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rows[0] : { id, ...logData };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteLog = async (id) => {
  await pool.query('DELETE FROM effectiveness_logs WHERE id = ?', [id]);
  return { id };
};

export const getAttachment = async (logId, fileName) => {
  const [rows] = await pool.query(
    `SELECT file_name as name, file_data as data, file_type as type 
     FROM effectiveness_attachments 
     WHERE log_id = ? AND file_name = ?`,
    [logId, fileName]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const resetLogsToDefaults = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM effectiveness_attachments');
    await connection.query('DELETE FROM effectiveness_logs');
    
    // Seed default logs
    await connection.query(
      `INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval) VALUES
       ('EFF-8901', 'CHG-8901', '2026-05-19', 'Integrate Auth0 SSO provider for corporate domain', '2026-05-20', '2026-05', 'SSO integration successfully verified. Token refresh intervals and domain constraints are fully operational. Zero authentication latency observed.', 'sso-verification-report.pdf', 'Effectiveness Ok', 'Approved'),
       ('EFF-8895', 'CHG-8895', '2026-05-15', 'Resolve security vulnerability CVE-2026-3392', '2026-05-16', '2026-05', 'Patch applied to all production instances. Vulnerability scan reports clean status. Compliance certification updated.', 'cve-scan-results.txt', 'Effectiveness Ok', 'Approved')`
    );
    
    // Seed default attachments
    await connection.query(
      `INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) VALUES
       ('EFF-8901', 'sso-verification-report.pdf', 'U1NPIFZlcmlmaWNhdGlvbiBSZXBvcnQgQ29udGVudHM=', 'application/pdf'),
       ('EFF-8895', 'cve-scan-results.txt', 'Q1ZFLTIwMjYtMzM5MiBQYXRjaGVkIGFuZCBWZXJpZmllZA==', 'text/plain')`
    );
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
