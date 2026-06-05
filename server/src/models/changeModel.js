import pool from '../config/db.js';

export const getChanges = async () => {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.requester, DATE_FORMAT(c.date, '%b %d, %Y') as date, c.priority, c.status,
            l1.dept, l1.process_name as processName, l1.machine_no as machineNo, l1.change_in as changeIn,
            v.status as l2Status
     FROM change_requests c
     LEFT JOIN l1_requests l1 ON c.id = l1.change_no
     LEFT JOIN l2_validation_logs v ON c.id = v.change_no
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
    `SELECT change_no as changeNo, validation_date as date, requester, 
            weld_test as weldTest, qa_test as qaTest, status, remarks 
     FROM l2_validation_logs 
     ORDER BY created_at DESC`
  );
  return rows;
};

export const addL2ValidationLog = async (logData, attachments) => {
  const { changeNo, date, requester, weldTest, qaTest, status, remarks } = logData;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         validation_date = VALUES(validation_date),
         requester = VALUES(requester),
         weld_test = VALUES(weld_test),
         qa_test = VALUES(qa_test),
         status = VALUES(status),
         remarks = VALUES(remarks)`,
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

    await connection.commit();
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
            u.name as requester,
            v.status as l2Decision,
            v.remarks as l2Remarks,
            COALESCE(l.ped, 'Pending') as ped,
            COALESCE(l.quality, 'Pending') as quality,
            COALESCE(l.production, 'Pending') as production,
            COALESCE(l.maintenance, 'Pending') as maintenance,
            COALESCE(l.pcl, 'Pending') as pcl,
            COALESCE(l.materials, 'Pending') as materials,
            COALESCE(l.marketing, 'Pending') as marketing,
            COALESCE(l.hr_safety, 'Pending') as hrSafety,
            COALESCE(l.unit_head, 'Pending') as unitHead
     FROM change_requests c
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
    ped, quality, production, maintenance, pcl, materials, marketing, hrSafety, unitHead 
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
         VALUES (?, ?, ?, CURDATE(), 'Medium', ?)`,
        [changeNo, `[L3 Auto] Approval for ${changeNo}`, 'admin@cms.com', unitHead === 'Approved' ? 'Approved' : 'Pending']
      );
    } else if (unitHead === 'Approved') {
      await connection.query(
        `UPDATE change_requests SET status = 'Approved' WHERE id = ?`,
        [changeNo]
      );
    } else if (unitHead === 'Rejected') {
      await connection.query(
        `UPDATE change_requests SET status = 'Evaluating' WHERE id = ?`,
        [changeNo]
      );
    }

    await connection.query(
      `INSERT INTO l3_approvals (
        change_no, date, requester, ped, quality, production, 
        maintenance, pcl, materials, marketing, hr_safety, unit_head
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
        hr_safety = VALUES(hr_safety),
        unit_head = VALUES(unit_head)`,
      [
        changeNo, date, requester, 
        ped || 'Pending', quality || 'Pending', production || 'Pending', 
        maintenance || 'Pending', pcl || 'Pending', materials || 'Pending', 
        marketing || 'Pending', hrSafety || 'Pending', unitHead || 'Pending'
      ]
    );

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
    `SELECT change_no as changeNo, validation_date as date, requester, 
            weld_test as weldTest, qa_test as qaTest, status, remarks 
     FROM l2_validation_logs 
     WHERE change_no = ?`,
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




