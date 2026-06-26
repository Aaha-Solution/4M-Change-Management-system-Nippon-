import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cms_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MySQL database successfully.');

    // Ensure max_allowed_packet is high enough for base64 file uploads (prevent ECONNRESET)
    try {
      await connection.query('SET GLOBAL max_allowed_packet = 167772160');
      console.log('✅ Set GLOBAL max_allowed_packet to 160MB.');
    } catch (err) {
      console.warn('⚠️ Could not set global max_allowed_packet:', err.message);
    }

    connection.release();
  } catch (error) {
    console.error('❌ Error connecting to MySQL database:', error.message);
  }
})();

export default pool;