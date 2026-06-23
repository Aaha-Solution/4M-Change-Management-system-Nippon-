import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: Number(process.env.MYSQLPORT),

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

(async () => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1 AS test');
    console.log('✅ Connected to MySQL:', rows);
    conn.release();
  } catch (error) {
    console.error('❌ Error connecting to MySQL database');
    console.error(error);
  }
})();

export default pool;