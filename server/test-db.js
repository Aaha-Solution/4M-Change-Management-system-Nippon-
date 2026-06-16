import pool from './src/config/db.js';
import { getChanges } from './src/models/allRequestsModel.js';

async function test() {
  try {
    const result = await getChanges();
    if (result.length > 0) {
      console.log('✅ Full sample request retrieved:', JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ No change requests found in the database.');
    }
  } catch (err) {
    console.error('❌ Query failed:', err);
  } finally {
    process.exit(0);
  }
}

test();
