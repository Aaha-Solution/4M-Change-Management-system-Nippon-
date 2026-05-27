import pool from '../config/db.js';

// Roles
export const getRoles = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM roles ORDER BY id ASC');
    const rolesList = rows.map(r => r.name);
    return res.status(200).json(rolesList);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({ error: 'Failed to fetch roles.' });
  }
};

export const addRole = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Role name is required.' });
  }
  const trimmed = name.trim();
  try {
    const [existing] = await pool.query('SELECT name FROM roles WHERE name = ?', [trimmed]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Role already exists.' });
    }
    await pool.query('INSERT INTO roles (name) VALUES (?)', [trimmed]);
    return res.status(201).json({ message: 'Role added successfully.', name: trimmed });
  } catch (error) {
    console.error('Error adding role:', error);
    return res.status(500).json({ error: 'Failed to add role.' });
  }
};

export const deleteRole = async (req, res) => {
  const { name } = req.params;
  try {
    await pool.query('DELETE FROM roles WHERE name = ?', [name]);
    return res.status(200).json({ message: 'Role deleted successfully.' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ error: 'Failed to delete role.' });
  }
};

// Departments
export const getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM departments ORDER BY id ASC');
    const deptsList = rows.map(d => d.name);
    return res.status(200).json(deptsList);
  } catch (error) {
    console.error('Error fetching departments:', error);
    return res.status(500).json({ error: 'Failed to fetch departments.' });
  }
};

export const addDepartment = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required.' });
  }
  const trimmed = name.trim();
  try {
    const [existing] = await pool.query('SELECT name FROM departments WHERE name = ?', [trimmed]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Department already exists.' });
    }
    await pool.query('INSERT INTO departments (name) VALUES (?)', [trimmed]);
    return res.status(201).json({ message: 'Department added successfully.', name: trimmed });
  } catch (error) {
    console.error('Error adding department:', error);
    return res.status(500).json({ error: 'Failed to add department.' });
  }
};

export const deleteDepartment = async (req, res) => {
  const { name } = req.params;
  try {
    await pool.query('DELETE FROM departments WHERE name = ?', [name]);
    return res.status(200).json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Error deleting department:', error);
    return res.status(500).json({ error: 'Failed to delete department.' });
  }
};
