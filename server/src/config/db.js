import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST,
  user: process.env.MYSQLUSER || process.env.DB_USER,
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME,
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000,

  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
(async () => {
  try {
    const conn = await pool.getConnection();

    const [rows] = await conn.query('SELECT NOW() AS dbTime');

    console.log('✅ Connected to MySQL');
    console.log(rows);

    conn.release();
  } catch (error) {
    console.error('❌ Error connecting to MySQL database');
    console.error(error);
  }
})();

export default pool;

// 