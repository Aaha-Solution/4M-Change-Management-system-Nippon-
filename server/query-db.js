import pool from './src/config/db.js';

async function check() {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    console.log('Database users count:', rows.length);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

check();
