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
DROP TABLE IF EXISTS l1_attachments;
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
('General'),
('PED'),
('QAD'),
('PRODUCTION'),
('MAINTENANCE'),
('PC & L'),
('MATERIALS'),
('MARKETING'),
('HR'),
('SAFETY');

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
('priya.v@plant.com', 'priya123', 'User', 'Priya Venkat', 'PRODUCTION', 'Active'),
('kumar.s@plant.com', 'kumar123', 'User', 'Kumar Selvam', 'PED', 'Active'),
('ravi.qa@plant.com', 'ravi123', 'User', 'Ravi QA', 'QAD', 'Active'),
('admin@cms.com', 'admin123', 'Admin', 'Admin User', 'General', 'Active'),
('manager@cms.com', 'manager123', 'User', 'Manager User', 'General', 'Active'),
('requester@cms.com', 'requester123', 'User', 'Requester User', 'General', 'Active');
-- No initial change requests seeded


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

-- No initial notifications seeded

-- No initial effectiveness logs seeded

-- No initial effectiveness attachments seeded

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
    trace_from TEXT NOT NULL,
    date_close DATE,
    trace_to TEXT NOT NULL,
    risk_analysis TEXT NOT NULL,
    sop_update TEXT NOT NULL,
    hod_approval TEXT NOT NULL,
    customer_approval VARCHAR(100) NOT NULL,
    effectiveness_monitoring TEXT NOT NULL,
    file_desc VARCHAR(255) NOT NULL DEFAULT '',
    file_improvement VARCHAR(255) NOT NULL DEFAULT '',
    file_trace_from VARCHAR(255) NOT NULL DEFAULT '',
    file_trace_to VARCHAR(255) NOT NULL DEFAULT '',
    file_risk VARCHAR(255) NOT NULL DEFAULT '',
    file_sop VARCHAR(255) NOT NULL DEFAULT '',
    file_effectiveness VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6a. L1 Attachments Table
CREATE TABLE l1_attachments (
    id SERIAL PRIMARY KEY,
    change_no VARCHAR(50) NOT NULL REFERENCES l1_requests(change_no) ON UPDATE CASCADE ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_data LONGTEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
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

-- Seed one change request for L3 and E2E tests
INSERT INTO change_requests (id, title, requester, date, priority, status) VALUES
('4M-2026-1', 'Machine Change in Welding Line A', 'kumar.s@plant.com', '2026-05-20', 'High', 'Pending');

INSERT INTO l1_requests (
    change_no, unit, requested_time, change_in, dept, request_by, 
    process_name, process_line, machine_no, description, 
    improvement_area, change_type, date_start, trace_from, 
    date_close, trace_to, risk_analysis, sop_update, 
    hod_approval, customer_approval, effectiveness_monitoring
) VALUES
('4M-2026-1', 'Unit 1', '14:30', 'Machine', 'PRODUCTION', 'Kumar Selvam', 'Welding Line A', 'Line A', 'MFG-MC-2011', 'Machine Change in Welding Line A description.', 'Delivery', 'Permanent', '2026-05-20', 'Trace from details...', '2026-05-22', 'Trace to details...', 'Medium risk', 'FMEA updated', 'Approved', 'Yes', 'Welding strength tests');

INSERT INTO l2_validation_logs (change_no, validation_date, requester, weld_test, qa_test, status, remarks) VALUES
('4M-2026-1', '20 May', 'Kumar Selvam', 'weld-test.png', 'weld-test.png', 'Accepted', 'Zero alignment issues reported in shift logs.');


