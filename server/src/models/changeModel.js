import pool from '../config/db.js';

export const getChanges = async () => {
  const [rows] = await pool.query(
    `SELECT id, title, requester, DATE_FORMAT(date, '%b %d, %Y') as date, priority, status 
     FROM change_requests 
     ORDER BY created_at DESC`
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

export const addL1Request = async (l1Data, userEmail) => {
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
      effectivenessMonitoring
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
        hod_approval, customer_approval, effectiveness_monitoring
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        changeNo, unit, requestedTime, changeIn || '', dept, requestBy,
        processName, processLine, machineNo, description,
        improvementArea, changeType, formatDateToSql(dateStart), traceFrom,
        formatDateToSql(dateClose), traceTo, riskAnalysis, sopUpdate,
        hodApproval, customerApproval, effectivenessMonitoring
      ]
    );

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

