import pool from './src/config/db.js';

(async () => {
  try {
    const [rows] = await pool.query('SELECT name, email, department, role FROM users');
    console.table(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
