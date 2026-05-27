import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

async function run() {
  let connection;
  try {
    // 1. Connect without database to create it
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server.');
    
    const dbName = process.env.DB_NAME || 'cms_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database '${dbName}' created or already exists.`);
    await connection.end();

    // 2. Connect to the specific database
    connection = await mysql.createConnection({
      ...dbConfig,
      database: dbName,
      multipleStatements: true
    });
    console.log(`Connected to database '${dbName}'.`);

    // Read schema.sql
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Make schema compatible with MySQL if it has Postgres specific syntax
    // e.g. SERIAL PRIMARY KEY -> INT AUTO_INCREMENT PRIMARY KEY
    schemaSql = schemaSql.replace(/SERIAL PRIMARY KEY/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
    // e.g. DEFAULT CURRENT_DATE -> DEFAULT (CURRENT_DATE)
    schemaSql = schemaSql.replace(/DEFAULT CURRENT_DATE/gi, 'DEFAULT (CURRENT_DATE)');

    console.log('Executing schema...');
    await connection.query(schemaSql);
    console.log('✅ Database schema initialized and seeded successfully.');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

run();
