-- -------------------------------------------------------------
-- Database Schema for Change Management System (CMS.io)
-- Supports PostgreSQL / MySQL
-- -------------------------------------------------------------

-- Drop tables if they already exist (for clean initialization)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS effectiveness_attachments;
DROP TABLE IF EXISTS effectiveness_logs;
DROP TABLE IF EXISTS l3_approvals;
DROP TABLE IF EXISTS l2_validation_logs;
DROP TABLE IF EXISTS l1_requests;
DROP TABLE IF EXISTS change_requests;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS processes;
DROP TABLE IF EXISTS machines;

-- Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Processes Table
CREATE TABLE processes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Machines Table
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- In production, this should be a hashed password (e.g. bcrypt)
    role VARCHAR(50) NOT NULL,
    department VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for fast authentication lookups
CREATE INDEX idx_users_email ON users(email);

-- 2. Change Requests Table
CREATE TABLE change_requests (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'CHG-8902'
    title VARCHAR(255) NOT NULL,
    requester VARCHAR(255) NOT NULL REFERENCES users(email) ON UPDATE CASCADE ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
    status VARCHAR(30) NOT NULL CHECK (status IN ('Pending', 'Evaluating', 'Approved', 'Completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status and requester for filtering/lookups
CREATE INDEX idx_change_requests_status ON change_requests(status);
CREATE INDEX idx_change_requests_requester ON change_requests(requester);

-- -------------------------------------------------------------
-- Seed Data
-- -------------------------------------------------------------

-- Seed Roles
INSERT INTO roles (name) VALUES
('Admin'),
('User');

-- Seed Departments
INSERT INTO departments (name) VALUES
('General');

-- Seed Processes
INSERT INTO processes (name) VALUES 
('Gold Line'), 
('Welding Line A'), 
('Injection Molding B'), 
('Potting Line'), 
('Gauge Line');

-- Seed Machines
INSERT INTO machines (name) VALUES 
('MFG-MC-1042'), 
('MFG-MC-2011'), 
('MFG-MC-1033'), 
('MFG-MC-1044'), 
('MFG-MC-1045'), 
('MFG-MC-1046');

-- Seed users (quick-login roles matching mockup)
INSERT INTO users (email, password, role, name, department, status) VALUES
('ramanan.p@plant.com', 'ramanan123', 'Admin', 'Ramanan Prabakaran', 'General', 'Active'),
('priya.v@plant.com', 'priya123', 'User', 'Priya Venkat', 'General', 'Active'),
('kumar.s@plant.com', 'kumar123', 'User', 'Kumar Selvam', 'General', 'Active'),
('ravi.qa@plant.com', 'ravi123', 'User', 'Ravi QA', 'General', 'Active'),
('admin@cms.com', 'admin123', 'Admin', 'Admin User', 'General', 'Active'),
('manager@cms.com', 'manager123', 'User', 'Manager User', 'General', 'Active'),
('requester@cms.com', 'requester123', 'User', 'Requester User', 'General', 'Active');
-- Seed change requests
INSERT INTO change_requests (id, title, requester, date, priority, status) VALUES
('CHG-8902', 'Upgrade production database cluster to PostgreSQL 16', 'admin@cms.com', '2026-05-20', 'High', 'Approved'),
('CHG-8901', 'Integrate Auth0 SSO provider for corporate domain', 'manager@cms.com', '2026-05-19', 'High', 'Approved'),
('CHG-8899', 'Modify API Gateway route rules for caching layers', 'requester@cms.com', '2026-05-18', 'Medium', 'Evaluating'),
('CHG-8895', 'Resolve security vulnerability CVE-2026-3392', 'admin@cms.com', '2026-05-15', 'High', 'Completed'),
('4M-2026-248', 'Machine Change in Welding Line A', 'kumar.s@plant.com', '2026-05-20', 'High', 'Approved'),
('4M-2026-247', 'Method Calibration Setup', 'ravi.qa@plant.com', '2026-05-19', 'High', 'Approved'),
('4M-2026-246', 'Material Spec Adjustment in Injection Molding B', 'kumar.s@plant.com', '2026-05-18', 'Medium', 'Evaluating'),
('4M-2026-244', 'Man Training Syllabus Update', 'requester@cms.com', '2026-05-17', 'Medium', 'Pending'),
('4M-2026-243', 'Gauge Repeatability Check', 'ravi.qa@plant.com', '2026-05-16', 'Low', 'Approved'),
('4M-2026-241', 'Coolant Viscosity Spec Match', 'kumar.s@plant.com', '2026-05-14', 'Medium', 'Approved');


-- 3. Effectiveness Logs Table
CREATE TABLE effectiveness_logs (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'EFF-001'
    change_no VARCHAR(50) NOT NULL REFERENCES change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    req_date DATE NOT NULL,
    context VARCHAR(255) NOT NULL DEFAULT '',
    start_date DATE NOT NULL,
    month_wise VARCHAR(20) NOT NULL DEFAULT '',
    remarks TEXT,
    attachment VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT '',
    qa_approval VARCHAR(50) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Effectiveness Attachments Table
CREATE TABLE effectiveness_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id VARCHAR(50) NOT NULL REFERENCES effectiveness_logs(id) ON UPDATE CASCADE ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_data LONGTEXT NOT NULL, -- stores base64 data
    file_type VARCHAR(100) NOT NULL, -- e.g. 'application/pdf', 'image/png'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Notifications Table
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    change_no VARCHAR(50) NOT NULL DEFAULT '',
    category VARCHAR(50) NOT NULL DEFAULT '',
    dept VARCHAR(100) NOT NULL DEFAULT '',
    time_str VARCHAR(100) NOT NULL DEFAULT '',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(100) NOT NULL DEFAULT '',
    color VARCHAR(20) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed notifications
INSERT INTO notifications (id, title, details, change_no, category, dept, time_str, is_read, type, color) VALUES
('ALR-001', 'L2 Setup Validation Awaiting', 'Change Request 4M-2026-248 (Machine change in Welding Line A) requires L2 PED validation setup checklist.', '4M-2026-248', 'MACHINE', 'PED', 'Just now', FALSE, 'Action Required', 'blue'),
('ALR-002', 'Change Request Approved by HOD', 'Change Request 4M-2026-247 (Method calibration) has been approved by L3 HOD and forwarded to unit supervisor.', '4M-2026-247', 'METHOD', 'QAD', '2 hours ago', TRUE, 'System Logs', 'green'),
('ALR-003', 'L3 Final Review Required', 'Change Request 4M-2026-246 (Material spec adjustment in Injection Moulding B) reached L3 review stages.', '4M-2026-246', 'MATERIAL', 'PRODUCTION', '5 hours ago', FALSE, 'Action Required', 'blue'),
('ALR-004', 'Change Request Rejected', 'Change Request 4M-2026-244 (Man training syllabus update) was rejected by Unit Head. Comments: Needs syllabus validation.', '4M-2026-244', 'MAN', 'MAINTENANCE', 'Yesterday', TRUE, 'System Logs', 'red'),
('ALR-005', 'Effectiveness Evaluation Due', 'The 3-Month QA post-implementation observation logs are now due for approved Request 4M-2026-231.', '4M-2026-231', 'SYSTEM', 'QA', '3 days ago', FALSE, 'Action Required', 'orange'),
('ALR-006', 'SSO Certificate Re-signature Done', 'SSO provider Auth0 corporate domain certificate updated and verified.', '4M-2026-230', 'SYSTEM', 'IT', '4 days ago', TRUE, 'System Logs', 'green');

-- Seed effectiveness logs
INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval) VALUES
('EFF-8901', 'CHG-8901', '2026-05-19', 'Integrate Auth0 SSO provider for corporate domain', '2026-05-20', '2026-05', 'SSO integration successfully verified. Token refresh intervals and domain constraints are fully operational. Zero authentication latency observed.', 'sso-verification-report.pdf', 'Effectiveness Ok', 'Approved'),
('EFF-8895', 'CHG-8895', '2026-05-15', 'Resolve security vulnerability CVE-2026-3392', '2026-05-16', '2026-05', 'Patch applied to all production instances. Vulnerability scan reports clean status. Compliance certification updated.', 'cve-scan-results.txt', 'Effectiveness Ok', 'Approved');

-- Seed effectiveness attachments
INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) VALUES
('EFF-8901', 'sso-verification-report.pdf', 'U1NPIFZlcmlmaWNhdGlvbiBSZXBvcnQgQ29udGVudHM=', 'application/pdf'),
('EFF-8895', 'cve-scan-results.txt', 'Q1ZFLTIwMjYtMzM5MiBQYXRjaGVkIGFuZCBWZXJpZmllZA==', 'text/plain');

-- 6. L1 Requests Table
CREATE TABLE l1_requests (
    change_no VARCHAR(50) PRIMARY KEY REFERENCES change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    unit VARCHAR(100) NOT NULL,
    requested_time VARCHAR(20) NOT NULL,
    change_in VARCHAR(255) NOT NULL DEFAULT '',
    dept VARCHAR(100) NOT NULL,
    request_by VARCHAR(100) NOT NULL,
    process_name VARCHAR(100) NOT NULL,
    process_line VARCHAR(100) NOT NULL,
    machine_no VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    improvement_area VARCHAR(100) NOT NULL,
    change_type VARCHAR(100) NOT NULL,
    date_start DATE,
    trace_from VARCHAR(100) NOT NULL,
    date_close DATE,
    trace_to VARCHAR(100) NOT NULL,
    risk_analysis TEXT NOT NULL,
    sop_update VARCHAR(100) NOT NULL,
    hod_approval VARCHAR(100) NOT NULL,
    customer_approval VARCHAR(100) NOT NULL,
    effectiveness_monitoring TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. L2 Validation Logs Table
CREATE TABLE l2_validation_logs (
    change_no VARCHAR(50) PRIMARY KEY REFERENCES change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    validation_date VARCHAR(50) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    weld_test VARCHAR(255) NOT NULL DEFAULT '',
    qa_test VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(50) NOT NULL,
    remarks TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed L2 Validation Logs
INSERT INTO l2_validation_logs (change_no, validation_date, requester, weld_test, qa_test, status, remarks) VALUES
('4M-2026-248', '20 May', 'Kumar Selvam', 'weld-test.png', 'weld-test.png', 'Accepted', 'Zero alignment issues reported in shift logs. Production output exceeds threshold.'),
('4M-2026-247', '19 May', 'Ravi QA', 'calib-report.pdf', 'calib-report.pdf', 'Accepted', 'Calibration setup validated. GR&R is within 5%.'),
('4M-2026-246', '18 May', 'Kumar S.', 'mock-run-logs.xls', 'mock-run-logs.xls', 'Accepted', 'PED validation completed successfully on mock runs.'),
('4M-2026-244', '17 May', 'John Doe', 'training-log.pdf', 'training-log.pdf', 'Rejected', 'Evidence of training incomplete for Operator B. Training records missing.'),
('4M-2026-243', '16 May', 'Ravi QA', 'gauge-rr-may20.pdf', 'gauge-rr-may20.pdf', 'Accepted', 'Gauge repeatability improved by 14%. Zero repeat defects. Implementation consistent.'),
('4M-2026-241', '14 May', 'Kumar S.', 'coolant-spec.pdf', 'coolant-spec.pdf', 'Accepted', 'Coolant viscosity specs match engineering standard.');

-- 8. L3 Approvals Table
CREATE TABLE l3_approvals (
    change_no VARCHAR(50) PRIMARY KEY REFERENCES change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
    date VARCHAR(50) NOT NULL,
    requester VARCHAR(255) NOT NULL,
    ped VARCHAR(50) NOT NULL DEFAULT 'Pending',
    quality VARCHAR(50) NOT NULL DEFAULT 'Pending',
    production VARCHAR(50) NOT NULL DEFAULT 'Pending',
    maintenance VARCHAR(50) NOT NULL DEFAULT 'Pending',
    pcl VARCHAR(50) NOT NULL DEFAULT 'Pending',
    materials VARCHAR(50) NOT NULL DEFAULT 'Pending',
    marketing VARCHAR(50) NOT NULL DEFAULT 'Pending',
    hr_safety VARCHAR(50) NOT NULL DEFAULT 'Pending',
    unit_head VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed L3 Approvals
INSERT INTO l3_approvals (change_no, date, requester, ped, quality, production, maintenance, pcl, materials, marketing, hr_safety, unit_head) VALUES
('4M-2026-248', '20 May', 'Kumar Selvam', 'Accepted', 'Accepted', 'Approved', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Approved'),
('4M-2026-247', '19 May', 'Ravi QA', 'Accepted', 'Accepted', 'Approved', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Approved'),
('4M-2026-246', '18 May', 'Kumar S.', 'Accepted', 'Accepted', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending'),
('4M-2026-244', '17 May', 'John Doe', 'Rejected', 'Rejected', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending'),
('4M-2026-243', '16 May', 'Ravi QA', 'Accepted', 'Accepted', 'Approved', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Approved'),
('4M-2026-241', '14 May', 'Kumar S.', 'Accepted', 'Accepted', 'Approved', 'Pending', 'Pending', 'Pending', 'Pending', 'Pending', 'Approved');

-- Seed L1 Requests matching the seeded change requests
INSERT INTO l1_requests (
    change_no, unit, requested_time, change_in, dept, request_by, 
    process_name, process_line, machine_no, description, 
    improvement_area, change_type, date_start, trace_from, 
    date_close, trace_to, risk_analysis, sop_update, 
    hod_approval, customer_approval, effectiveness_monitoring
) VALUES
('CHG-8902', 'Unit 1', '10:00', 'Method', 'PRODUCTION', 'Admin User', 'Gold Line', 'Line 1', 'MFG-MC-1042', 'Database cluster upgrade description...', 'Quality', 'Permanent', '2026-05-20', 'Trace from logic...', '2026-05-25', 'Trace to logic...', 'Low risk', 'SOP updated', 'Approved', 'No', '3-month tracking'),
('CHG-8901', 'Unit 1', '11:00', 'Method', 'MATERIALS', 'Manager User', 'Gold Line', 'Line 2', 'MFG-MC-1042', 'Integrate Auth0 SSO provider...', 'Cost', 'Permanent', '2026-05-19', 'Trace from...', '2026-05-24', 'Trace to...', 'Medium risk', 'WI updated', 'Approved', 'No', 'SSO health monitoring'),
('CHG-8899', 'Unit 2', '12:00', 'Method', 'PRODUCTION', 'Requester User', 'Gold Line', 'Line 3', 'MFG-MC-1042', 'Modify API Gateway route rules...', 'Quality', 'Permanent', '2026-05-18', 'Trace from...', '2026-05-23', 'Trace to...', 'Low risk', 'SOP updated', 'Approved', 'No', 'Gateway latency check'),
('CHG-8895', 'Unit 1', '09:00', 'Method', 'PED', 'Admin User', 'Gold Line', 'Line 1', 'MFG-MC-1042', 'Resolve security vulnerability CVE-2026-3392...', 'Safety', 'Permanent', '2026-05-15', 'Trace from...', '2026-05-16', 'Trace to...', 'High risk', 'WI updated', 'Approved', 'No', 'Security scans'),
('4M-2026-248', 'Unit 1', '14:30', 'Machine', 'PRODUCTION', 'Kumar Selvam', 'Welding Line A', 'Line A', 'MFG-MC-2011', 'Machine Change in Welding Line A...', 'Delivery', 'Permanent', '2026-05-20', 'Trace from...', '2026-05-22', 'Trace to...', 'Medium risk', 'FMEA updated', 'Approved', 'Yes', 'Welding strength tests'),
('4M-2026-247', 'Unit 1', '08:45', 'Method', 'QUALITY', 'Ravi QA', 'Gold Line', 'Line C', 'MFG-MC-1033', 'Method Calibration Setup...', 'Quality', 'Permanent', '2026-05-19', 'Trace from...', '2026-05-20', 'Trace to...', 'Low risk', 'Calibration sheet updated', 'Approved', 'No', 'GR&R validation'),
('4M-2026-246', 'Unit 3', '15:15', 'Material', 'PRODUCTION', 'Kumar Selvam', 'Injection Molding B', 'Line B', 'MFG-MC-1044', 'Material Spec Adjustment in Injection Molding B...', 'Quality', 'Temporary', '2026-05-18', 'Trace from...', '2026-05-28', 'Trace to...', 'High risk', 'Control plan updated', 'Approved', 'Yes', 'Molding defect rate monitoring'),
('4M-2026-244', 'Unit 1', '11:00', 'Man', 'PRODUCTION', 'Requester User', 'Potting Line', 'Line 4', 'MFG-MC-1042', 'Man Training Syllabus Update...', 'Safety', 'Permanent', '2026-05-17', 'Trace from...', '2026-05-19', 'Trace to...', 'Low risk', 'Training record updated', 'Pending', 'No', 'Operator performance metrics'),
('4M-2026-243', 'Unit 2', '10:30', 'Measurement', 'QUALITY', 'Ravi QA', 'Gauge Line', 'Line 5', 'MFG-MC-1045', 'Gauge Repeatability Check...', 'Quality', 'Permanent', '2026-05-16', 'Trace from...', '2026-05-17', 'Trace to...', 'Low risk', 'SOP updated', 'Approved', 'No', 'Repeatability records'),
('4M-2026-241', 'Unit 1', '13:00', 'Material', 'PRODUCTION', 'Kumar Selvam', 'Welding Line A', 'Line A', 'MFG-MC-1046', 'Coolant Viscosity Spec Match...', 'Cost', 'Permanent', '2026-05-14', 'Trace from...', '2026-05-15', 'Trace to...', 'Low risk', 'Control plan updated', 'Approved', 'No', 'Viscosity periodic tests');


