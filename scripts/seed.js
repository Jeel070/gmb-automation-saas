/**
 * Seed script — creates test agency + client + sample posts.
 * Run: node scripts/seed.js
 *
 * Test credentials after seeding:
 *   Agency:  agency@demo.com   / agency123
 *   Client:  client@demo.com   / client123
 */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../src/db');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding test data...\n');

    // ── Agency ──────────────────────────────────
    const agencyId = uuidv4();
    const agencyHash = await bcrypt.hash('agency123', 10);

    await client.query(
      `INSERT INTO tenants (id, name, email, password_hash, type)
       VALUES ($1, $2, $3, $4, 'agency')
       ON CONFLICT (email) DO NOTHING`,
      [agencyId, 'Demo Agency', 'agency@demo.com', agencyHash]
    );

    // Re-fetch to get the actual ID (in case it already existed)
    const agencyRow = await client.query(
      'SELECT id FROM tenants WHERE email = $1',
      ['agency@demo.com']
    );
    const actualAgencyId = agencyRow.rows[0].id;

    console.log(`✓ Agency created`);
    console.log(`  Email:    agency@demo.com`);
    console.log(`  Password: agency123`);
    console.log(`  ID:       ${actualAgencyId}\n`);

    // ── Client (sub-tenant under agency) ────────
    const clientId = uuidv4();
    const clientHash = await bcrypt.hash('client123', 10);

    await client.query(
      `INSERT INTO tenants (id, name, email, password_hash, type, agency_id)
       VALUES ($1, $2, $3, $4, 'client', $5)
       ON CONFLICT (email) DO NOTHING`,
      [clientId, 'Demo Client - Pizza Palace', 'client@demo.com', clientHash, actualAgencyId]
    );

    const clientRow = await client.query(
      'SELECT id FROM tenants WHERE email = $1',
      ['client@demo.com']
    );
    const actualClientId = clientRow.rows[0].id;

    console.log(`✓ Client created`);
    console.log(`  Email:    client@demo.com`);
    console.log(`  Password: client123`);
    console.log(`  ID:       ${actualClientId}\n`);

    // ── Sample Posts for client ──────────────────
    const now = new Date();

    const posts = [
      {
        id: uuidv4(),
        title: 'Weekend Special — 50% Off All Pizzas!',
        content: 'This weekend only, enjoy 50% off all large pizzas. Visit us Saturday or Sunday and bring the family!',
        scheduled_at: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago — will be picked up by scheduler
        status: 'scheduled',
      },
      {
        id: uuidv4(),
        title: 'New Menu Launch — Truffle Pizza Is Here',
        content: 'We are thrilled to announce our new truffle pizza! Made with fresh black truffle shavings and mozzarella.',
        scheduled_at: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
        status: 'scheduled',
      },
      {
        id: uuidv4(),
        title: 'Happy Hours Every Monday',
        content: 'Every Monday from 3pm–6pm, get buy-one-get-one drinks. The perfect start to your week!',
        scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000), // tomorrow
        status: 'draft',
      },
    ];

    for (const post of posts) {
      await client.query(
        `INSERT INTO posts (id, tenant_id, title, content, scheduled_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [post.id, actualClientId, post.title, post.content, post.scheduled_at, post.status]
      );
      console.log(`✓ Post created: "${post.title}" [${post.status}]`);
    }

    console.log('\n All seed data created successfully!');
    console.log('\n Ready to test:');
    console.log('  POST /api/auth/login  { "email": "agency@demo.com", "password": "agency123" }');
    console.log('  POST /api/auth/login  { "email": "client@demo.com", "password": "client123" }');

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
