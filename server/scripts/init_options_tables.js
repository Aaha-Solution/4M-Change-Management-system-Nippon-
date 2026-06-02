import pool from '../src/config/db.js';

async function init() {
  try {
    console.log('Creating processes and machines tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS processes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS machines (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      );
    `);

    // Seed Data
    const processes = ['Gold Line', 'Welding Line A', 'Injection Molding B', 'Potting Line', 'Gauge Line'];
    for (const p of processes) {
      await pool.query('INSERT IGNORE INTO processes (name) VALUES (?)', [p]);
    }

    const machines = ['MFG-MC-1042', 'MFG-MC-2011', 'MFG-MC-1033', 'MFG-MC-1044', 'MFG-MC-1045', 'MFG-MC-1046'];
    for (const m of machines) {
      await pool.query('INSERT IGNORE INTO machines (name) VALUES (?)', [m]);
    }

    console.log('Tables created and seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

init();
