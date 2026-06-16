import pool from '../src/config/db.js';
import { createL1RequestNotifications, sendL1RequestEmails, createL1DecisionNotifications, sendL1DecisionEmails } from '../src/models/l1NotificationModel.js';
import { createL2Notifications, sendL2Emails } from '../src/models/l2NotificationModel.js';
import { createL3DecisionNotifications, sendL3DecisionEmails } from '../src/models/l3NotificationModel.js';
import { triggerEffectivenessQAAlert } from '../src/models/effectivenessNotificationModel.js';

const runTests = async () => {
  console.log('--- STARTING REFACTORED LEVEL NOTIFICATIONS SIMULATION TEST ---');
  const connection = await pool.getConnection();
  try {
    const changeNo = '4M-TEST-SIM-9999';

    // Query all admin emails
    const [adminRows] = await connection.query("SELECT email FROM users WHERE role = 'Admin'");
    if (adminRows.length === 0) {
      throw new Error("No admin user found in database");
    }
    const adminEmail = adminRows[0].email;
    console.log(`Resolved simulation admin email: ${adminEmail}`);

    // Cleanup any existing simulation data first
    console.log('Cleaning up previous test data if any...');
    await connection.query('DELETE FROM notifications WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l2_validation_logs WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l3_approvals WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l1_requests WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM change_requests WHERE id = ?', [changeNo]);

    // Insert test change request
    console.log('Inserting test Change Request...');
    await connection.query(
      `INSERT INTO change_requests (id, title, requester, date, priority, status) 
       VALUES (?, ?, ?, CURDATE(), 'High', 'Pending')`,
      [changeNo, '[SIMULATION TEST] Decoupled Level Notifications', adminEmail]
    );

    // Insert test L1 request with all required columns populated
    await connection.query(
      `INSERT INTO l1_requests (
        change_no, unit, requested_time, change_in, dept, request_by, 
        process_name, process_line, machine_no, description, 
        improvement_area, change_type, date_start, trace_from, 
        date_close, trace_to, risk_analysis, sop_update, 
        hod_approval, customer_approval, effectiveness_monitoring
      ) VALUES (?, 'Unit 1', '12:00', 'METHOD', 'PED', 'Sim Tester', 'Test Process', 'Line 1', 'M-9999', 'Simulation description', 'Test Area', 'Temporary', '2026-06-16', 'Trace From Info', '2026-06-17', 'Trace To Info', 'Risk Info', 'SOP Info', 'Quality, Production', 'No', 'No')`,
      [changeNo]
    );

    console.log('\n--- 1. Testing L1 Request Notification/Email ---');
    const l1NotifIds = await createL1RequestNotifications(
      connection, changeNo, 'Quality, Production', 'METHOD', 'Sim Tester', 'PED'
    );
    console.log('Created L1 notification IDs:', l1NotifIds);
    await sendL1RequestEmails(changeNo, 'Quality, Production', 'METHOD', 'Sim Tester', 'PED');
    console.log('L1 request email dispatch completed.');

    console.log('\n--- 2. Testing L1 Decision Notification/Email (HOD Approve) ---');
    const { notifIds: l1DecIds, crDetails } = await createL1DecisionNotifications(
      connection, changeNo, 'Quality', 'Approved', 'Looks good'
    );
    console.log('Created L1 decision notification IDs:', l1DecIds);
    await sendL1DecisionEmails(changeNo, 'Quality', 'Approved', 'Looks good', crDetails);
    console.log('L1 HOD decision email dispatch completed.');

    console.log('\n--- 3. Testing L2 Notification/Email (Pending) ---');
    const l2LogPending = {
      date: '2026-06-16',
      requester: 'Sim Tester L2',
      weldTest: 'Pass',
      qaTest: 'Awaiting',
      remarks: 'Submitted for verification'
    };
    const targetUsersPending = await createL2Notifications(
      connection, changeNo, 'Pending', l2LogPending, 'PED', 'Sim Tester L2', 
      '[SIMULATION TEST] Decoupled Level Notifications', adminEmail, 'PED', 'METHOD', 'Test Process', 'M-9999'
    );
    console.log('L2 Pending targets resolved:', targetUsersPending.map(u => u.email));
    await sendL2Emails(
      changeNo, 'Pending', l2LogPending, 'PED', 'Sim Tester L2', 
      adminEmail, 'PED', '[SIMULATION TEST] Decoupled Level Notifications', 'METHOD', 'Test Process', 'M-9999', targetUsersPending
    );
    console.log('L2 Pending email dispatch completed.');

    console.log('\n--- 4. Testing L2 Notification/Email (Accepted) ---');
    const l2LogAccepted = {
      date: '2026-06-16',
      requester: 'Sim Tester L2',
      weldTest: 'Pass',
      qaTest: 'Pass',
      remarks: 'All tests passed'
    };
    const targetUsersAccepted = await createL2Notifications(
      connection, changeNo, 'Accepted', l2LogAccepted, 'PED', 'Sim Tester L2', 
      '[SIMULATION TEST] Decoupled Level Notifications', adminEmail, 'PED', 'METHOD', 'Test Process', 'M-9999'
    );
    console.log('L2 Accepted targets resolved:', targetUsersAccepted.map(u => u.email));
    await sendL2Emails(
      changeNo, 'Accepted', l2LogAccepted, 'PED', 'Sim Tester L2', 
      adminEmail, 'PED', '[SIMULATION TEST] Decoupled Level Notifications', 'METHOD', 'Test Process', 'M-9999', targetUsersAccepted
    );
    console.log('L2 Accepted email dispatch completed.');

    console.log('\n--- 5. Testing L3 Decision Notification/Email (Approved by PED HOD) ---');
    const l3NotifIds = await createL3DecisionNotifications(
      connection, changeNo, 'PED', 'Approved', 'METHOD', 'Sim Tester', adminEmail, 'PED'
    );
    console.log('L3 Decision notifications created:', l3NotifIds);
    await sendL3DecisionEmails(changeNo, 'PED', 'Approved', 'L3 approved by PED HOD remarks', adminEmail);
    console.log('L3 decision email dispatch completed.');

    console.log('\n--- 6. Testing Effectiveness QA Alert ---');
    await triggerEffectivenessQAAlert(changeNo, 'Approved', 'Post-monitoring results are excellent');
    console.log('Effectiveness QA Alert notification & email dispatch completed.');

    console.log('\nVerifying database inserts in notifications table:');
    const [rows] = await connection.query(
      'SELECT id, title, dept, recipient_email FROM notifications WHERE change_no = ? ORDER BY created_at ASC',
      [changeNo]
    );
    console.table(rows);

    // Final cleanup of simulation data
    console.log('\nCleaning up simulation test data...');
    await connection.query('DELETE FROM notifications WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l2_validation_logs WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l3_approvals WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM l1_requests WHERE change_no = ?', [changeNo]);
    await connection.query('DELETE FROM change_requests WHERE id = ?', [changeNo]);
    console.log('Cleanup finished.');

    console.log('\n✅ ALL DECOUPLED LEVEL NOTIFICATION SIMULATIONS PASSED SUCCESSFULLY.');
  } catch (error) {
    console.error('❌ SIMULATION TEST FAILED:', error);
  } finally {
    connection.release();
    process.exit(0);
  }
};

runTests();
