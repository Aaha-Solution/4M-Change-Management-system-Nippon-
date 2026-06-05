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
    
    // Ensure l2_attachments table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS l2_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        change_no VARCHAR(50) NOT NULL REFERENCES l2_validation_logs(change_no) ON UPDATE CASCADE ON DELETE CASCADE,
        field_name VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_data LONGTEXT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default files for 4M-2026-1 if not already present
    const [existing] = await connection.query(
      'SELECT id FROM l2_attachments WHERE change_no = ?',
      ['4M-2026-1']
    );
    if (existing.length === 0) {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      await connection.query(
        `INSERT INTO l2_attachments (change_no, field_name, file_name, file_data, file_type) VALUES 
         (?, 'weld_test', 'weld-test.png', ?, 'image/png'),
         (?, 'qa_test', 'weld-test.png', ?, 'image/png')`,
        ['4M-2026-1', dummyBase64, '4M-2026-1', dummyBase64]
      );
      console.log('✅ Seeded default L2 attachments successfully.');
    }

    connection.release();
  } catch (error) {
    console.error('❌ Error connecting to MySQL database:', error.message);
  }
})();

export default pool;


