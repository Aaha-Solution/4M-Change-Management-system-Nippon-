-- -------------------------------------------------------------
-- Database Schema for Change Management System (CMS.io)
-- Supports PostgreSQL / MySQL
-- -------------------------------------------------------------

-- Drop tables if they already exist (for clean initialization)
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS effectiveness_attachments;
DROP TABLE IF EXISTS effectiveness_logs;
DROP TABLE IF EXISTS change_requests;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS departments;

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
('CHG-8895', 'Resolve security vulnerability CVE-2026-3392', 'admin@cms.com', '2026-05-15', 'High', 'Completed');


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


