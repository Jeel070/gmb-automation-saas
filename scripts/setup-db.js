/**
 * Setup DB — creates all tables.
 * Run once: node scripts/setup-db.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function setupDB() {
  const schemaPath = path.join(__dirname, '../src/db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Running schema setup...');
    await client.query(sql);
    console.log('✓ Tables created successfully');
  } catch (err) {
    console.error('✗ Schema setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDB();
