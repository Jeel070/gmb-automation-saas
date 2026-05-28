const { Pool } = require('pg');

// Single connection pool reused across requests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err.message);
});

/**
 * Run a parameterized query
 * Usage: db.query('SELECT * FROM tenants WHERE id = $1', [id])
 */
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { query, pool };
