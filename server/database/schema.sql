-- -------------------------------------------------------------
-- Database Schema for Change Management System (CMS.io)
-- Supports PostgreSQL / MySQL
-- -------------------------------------------------------------

-- Drop tables if they already exist (for clean initialization)
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
