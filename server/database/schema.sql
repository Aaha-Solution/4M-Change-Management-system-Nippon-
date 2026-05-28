-- -------------------------------------------------------------
-- Database Schema for Change Management System (CMS.io)
-- Supports PostgreSQL / MySQL
-- -------------------------------------------------------------

-- Drop tables if they already exist (for clean initialization)
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
('CHG-8902', 'Upgrade production database cluster to PostgreSQL 16', 'admin@cms.com', '2026-05-20', 'High', 'Pending'),
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

-- Seed effectiveness logs
INSERT INTO effectiveness_logs (id, change_no, req_date, context, start_date, month_wise, remarks, attachment, status, qa_approval) VALUES
('EFF-001', 'CHG-8902', '2026-05-20', 'Upgrade production database cluster to PostgreSQL 16', '2026-05-22', '2026-05', 'Database performance improved. Read latency reduced by 25%. Replication is stable.', 'db-perf-report.pdf', 'Effectiveness Ok', 'Approved'),
('EFF-002', 'CHG-8901', '2026-05-19', 'Integrate Auth0 SSO provider for corporate domain', '2026-05-20', '2026-05', 'SSO configuration complete. Active Directory synced successfully. All tests passed.', 'auth0-signoff.png', 'Effectiveness Ok', 'Approved'),
('EFF-003', 'CHG-8899', '2026-05-18', 'Modify API Gateway route rules for caching layers', '2026-05-19', '2026-05', 'Response latency slightly increased. Cache hit ratio below expectations.', 'api-gateway-logs.txt', 'Effectiveness Not Ok', 'Rejected');

-- Seed effectiveness attachments
INSERT INTO effectiveness_attachments (log_id, file_name, file_data, file_type) VALUES
('EFF-001', 'db-perf-report.pdf', 'JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmogIDw8IC9UeXBlIC9QYWdlcwogICAgIC9LaWRzIFszIDAgUl0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqICA8PCAvVHlwZSAvUGFnZQogICAgIC9QYXJlbnQgMiAwIFIKICAgICAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQogICAgIC9Db250ZW50cyA0IDAgUgogID4+CmVuZG9iago0IDAgb2JqICA8PCAvTGVuZ3RoIDU2ID4+CnN0cmVhbQpCVAovRjEgMTIgVGYKNzIgNzEyIFRkCihOaXBwb24gUXVhbGl0eSBBc3N1cmFuY2UgLSBFZmZlY3RpdmVuZXNzIE9ic2VydmF0aW9uIExvZykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTkgMDAwMDAgbiAKMDAwMDAwMDA4MyAwMDAwMCBuIAowMDAwMDAwMTQ2IDAwMDAwIGggCjAwMDAwMDAyNTMgMDAwMDAgbiAKdHJhaWxlcgogIDw8IC9TaXplIDUKICAgICAvUm9vdCAxIDAgUgogID4+CnN0YXJ0eHJlZgogMzU4CiUlRU9G', 'application/pdf'),
('EFF-002', 'auth0-signoff.png', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'image/png'),
('EFF-003', 'api-gateway-logs.txt', 'ZXN0IGRvY3VtZW50', 'text/plain');
