import pool from '../config/db.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'cms_jwt_secret_key_2026';

export const login = async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT email, role, password FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Plaintext password comparison as matching seed data in schema.sql
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '24h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      email: user.email,
      role: user.role,
      token
    });
  } catch (error) {
    console.error('Error in login controller:', error);
    return res.status(500).json({ error: 'Server error during authentication.' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, password, role, department, status, DATE_FORMAT(created_at, '%b %d, %Y') as created_at FROM users ORDER BY created_at DESC"
    );
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    const [rows] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No user registered with this email address.' });
    }

    return res.status(200).json({
      message: `A password reset link has been sent to ${email}. Please check your inbox.`
    });
  } catch (error) {
    console.error('Error in forgotPassword controller:', error);
    return res.status(500).json({ error: 'Server error.' });
  }
};

export const signup = async (req, res) => {
  const { email, password, role, name, department } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const assignedRole = role || 'Requester';
  const allowedRoles = ['Admin', 'HOD', 'Operator', 'QA Team', 'Administrator', 'Change Manager', 'Requester'];
  if (!allowedRoles.includes(assignedRole)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const assignedName = name || '';
  const assignedDept = department || '';

  try {
    const [existing] = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    await pool.query(
      'INSERT INTO users (email, password, role, name, department) VALUES (?, ?, ?, ?, ?)',
      [email, password, assignedRole, assignedName, assignedDept]
    );

    const token = jwt.sign(
      { email, role: assignedRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      email,
      role: assignedRole,
      token
    });
  } catch (error) {
    console.error('Error in signup controller:', error);
    return res.status(500).json({ error: 'Server error during user registration.' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteUser controller:', error);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
};


