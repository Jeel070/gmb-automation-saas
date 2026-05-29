require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../src/db');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding test data...\n');

    // Create demo agency.
    const agencyId = uuidv4();
    const agencyHash = await bcrypt.hash('Woyce@123', 10);

    await client.query(
      `INSERT INTO tenants (id, name, email, password_hash, type)
       VALUES ($1, $2, $3, $4, 'agency')
       ON CONFLICT (email) DO NOTHING`,
      [agencyId, 'Demo Agency', 'test@agency.com', agencyHash]
    );

    // Re-read agency id in case it already existed.
    const agencyRow = await client.query(
      'SELECT id FROM tenants WHERE email = $1',
      ['test@agency.com']
    );
    const actualAgencyId = agencyRow.rows[0].id;

    console.log(`✓ Agency created`);
    console.log(`  Email:    test@agency.com`);
    console.log(`  Password: Woyce@123`);
    console.log(`  ID:       ${actualAgencyId}\n`);

    // Create demo client under agency.
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

    // Create sample posts.
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
    console.log('  POST /api/auth/login  { "email": "test@agency.com", "password": "Woyce@123" }');
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
