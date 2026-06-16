import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function run() {
  let connection;
  try {
    const dbName = process.env.DB_NAME || 'cms_db';
    console.log(`Connecting to database '${dbName}' for reset...`);
    
    // Create connection
    connection = await mysql.createConnection({
      ...dbConfig,
      database: dbName,
      multipleStatements: true
    });

    const schemaPath = path.resolve(__dirname, '../database/schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Schema compat fixes
    schemaSql = schemaSql.replace(/SERIAL PRIMARY KEY/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
    schemaSql = schemaSql.replace(/DEFAULT CURRENT_DATE/gi, 'DEFAULT (CURRENT_DATE)');

    console.log('Executing schema SQL statements...');
    await connection.query(schemaSql);
    console.log('✅ Database reset and seeded successfully.');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
