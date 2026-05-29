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

    await connection.query(`
      INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval) VALUES
      ('EFF-001', 'CHG-8902', '2026-05-20', 'Upgrade production database cluster to PostgreSQL 16', '2026-05-22', '2026-05', 'Database performance improved. Read latency reduced by 25%. Replication is stable.', 'db-perf-report.pdf', 'Effectiveness Ok', 'Approved'),
      ('EFF-002', 'CHG-8901', '2026-05-19', 'Integrate Auth0 SSO provider for corporate domain', '2026-05-20', '2026-05', 'SSO configuration complete. Active Directory synced successfully. All tests passed.', 'auth0-signoff.png', 'Effectiveness Ok', 'Approved'),
      ('EFF-003', 'CHG-8899', '2026-05-18', 'Modify API Gateway route rules for caching layers', '2026-05-19', '2026-05', 'Response latency slightly increased. Cache hit ratio below expectations.', 'api-gateway-logs.txt', 'Effectiveness Not Ok', 'Rejected')
    `);

    await connection.query(`
      INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) VALUES
      ('EFF-001', 'db-perf-report.pdf', 'JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmogIDw8IC9UeXBlIC9QYWdlcwogICAgIC9LaWRzIFszIDAgUl0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqICA8PCAvVHlwZSAvUGFnZQogICAgIC9QYXJlbnQgMiAwIFIKICAgICAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQogICAgIC9Db250ZW50cyA0IDAgUgogID4+CmVuZG9iago0IDAgb2JqICA8PCAvTGVuZ3RoIDU2ID4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzEyIFRkCihOaXBwb24gUXVhbGl0eSBBc3N1cmFuY2UgLSBFZmZlY3RpdmVuZXNzIE9ic2VydmF0aW9uIExvZykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDA4MyAwMDAwMCBuIAowMDAwMDAwMTQ2IDAwMDAwIGggCjAwMDAwMDAyNTMgMDAwMDAgbiAKdHJhaWxlcgogIDw8IC9TaXplIDUKICAgICAvUm9vdCAxIDAgUgogID4+CnN0YXJ0eHJlZgogMzU4CiUlRU9G', 'application/pdf'),
      ('EFF-002', 'auth0-signoff.png', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'image/png'),
      ('EFF-003', 'api-gateway-logs.txt', 'ZXN0IGRvY3VtZW50', 'text/plain')
    `);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
