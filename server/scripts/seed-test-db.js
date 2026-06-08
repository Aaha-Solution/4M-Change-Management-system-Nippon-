import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '2002',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'cms_db',
};

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server for seeding.');

    // 1. Seed Departments (not present in schema.sql)
    const depts = [
      'General', 'PED', 'QAD', 'PRODUCTION', 'MAINTENANCE',
      'PC & L', 'MATERIALS', 'MARKETING', 'HR', 'SAFETY'
    ];
    for (const name of depts) {
      await connection.query('INSERT IGNORE INTO departments (name) VALUES (?)', [name]);
    }

    // 2. Seed Processes (not present in schema.sql)
    const processes = [
      'Gold Line', 'Welding Line A', 'Injection Molding B', 'Potting Line', 'Gauge Line'
    ];
    for (const name of processes) {
      await connection.query('INSERT IGNORE INTO processes (name) VALUES (?)', [name]);
    }

    // 3. Seed Machines (not present in schema.sql)
    const machines = [
      'MFG-MC-1042', 'MFG-MC-2011', 'MFG-MC-1033', 'MFG-MC-1044', 'MFG-MC-1045', 'MFG-MC-1046'
    ];
    for (const name of machines) {
      await connection.query('INSERT IGNORE INTO machines (name) VALUES (?)', [name]);
    }

    // 4. Seed Test Users (excluding default admin/suriya which are seeded by schema.sql)
    const users = [
      { email: 'priya.v@plant.com', password: 'priya123', role: 'User', name: 'Priya Venkat', department: 'PRODUCTION', status: 'Active' },
      { email: 'kumar.s@plant.com', password: 'kumar123', role: 'User', name: 'Kumar Selvam', department: 'PED', status: 'Active' },
      { email: 'ravi.qa@plant.com', password: 'ravi123', role: 'User', name: 'Ravi QA', department: 'QAD', status: 'Active' },
      { email: 'manager@cms.com', password: 'manager123', role: 'User', name: 'Manager User', department: 'General', status: 'Active' },
      { email: 'requester@cms.com', password: 'requester123', role: 'User', name: 'Requester User', department: 'General', status: 'Active' },
    ];
    for (const u of users) {
      await connection.query(
        'INSERT INTO users (email, password, role, name, department, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password=VALUES(password), name=VALUES(name), department=VALUES(department), status=VALUES(status)',
        [u.email, u.password, u.role, u.name, u.department, u.status]
      );
    }

    // 5. Seed Change Request "4M-2026-1" with L1 and L2 validation data for Playwright tests
    const changeId = '4M-2026-1';
    
    // First clear existing if present to avoid duplicate key issues
    await connection.query('DELETE FROM change_requests WHERE id = ?', [changeId]);

    // Insert change_requests
    await connection.query(
      'INSERT INTO change_requests (id, title, requester, date, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
      [changeId, 'Mock Change Request', 'admin@cms.com', '2026-06-08', 'Medium', 'Evaluating']
    );

    // Insert l1_requests
    await connection.query(
      `INSERT INTO l1_requests (
        change_no, unit, requested_time, change_in, dept, request_by,
        process_name, process_line, machine_no, description, improvement_area,
        change_type, date_start, trace_from, date_close, trace_to, risk_analysis,
        sop_update, hod_approval, customer_approval, effectiveness_monitoring
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        changeId, 'Unit 1', '12:00', 'Machine,Method', 'PED', 'Kumar Selvam',
        'Welding Line A', 'Bay 12', 'MFG-MC-1042', 'E2E test description', 'Quality',
        'Temporary', '2026-06-08', 'LOT-100', '2026-06-15', 'LOT-110', 'None',
        'None', 'Approved by HOD Suriya.', 'No', 'None'
      ]
    );

    // Insert l2_validation_logs
    await connection.query(
      'INSERT INTO l2_validation_logs (change_no, validation_date, requester, status, remarks) VALUES (?, ?, ?, ?, ?)',
      [changeId, '08/06/2026', 'Kumar Selvam', 'Accepted', 'L2 validation comments for E2E tests']
    );

    console.log('✅ Seeded departments, processes, machines, test users, and change request 4M-2026-1.');
    console.log('🎉 Seed process completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

seed();
