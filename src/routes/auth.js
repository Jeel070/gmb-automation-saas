const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, agencyOnly } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function createToken(tenant) {
  return jwt.sign(
    {
      tenant_id: tenant.id,
      email: tenant.email,
      type: tenant.type,
      name: tenant.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// Agency signs up — creates a new agency tenant
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check if email is already taken
    const existing = await db.query('SELECT id FROM tenants WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO tenants (id, name, email, password_hash, type)
       VALUES ($1, $2, $3, $4, 'agency')
       RETURNING id, name, email, type, created_at`,
      [uuidv4(), name, email, password_hash]
    );

    const tenant = result.rows[0];
    const token = createToken(tenant);

    return res.status(201).json({
      message: 'Agency registered successfully',
      token,
      tenant: { id: tenant.id, name: tenant.name, email: tenant.email, type: tenant.type },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Works for both agency and client
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, type, agency_id FROM tenants WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tenant = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, tenant.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(tenant);

    return res.status(200).json({
      message: 'Login successful',
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        type: tenant.type,
        agency_id: tenant.agency_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/invite
// Agency invites a client — creates a sub-tenant under the agency
// Protected: agency only
// ─────────────────────────────────────────────
router.post('/invite', authMiddleware, agencyOnly, async (req, res) => {
  const { name, email, password } = req.body;
  const agency_id = req.user.tenant_id;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await db.query('SELECT id FROM tenants WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO tenants (id, name, email, password_hash, type, agency_id)
       VALUES ($1, $2, $3, $4, 'client', $5)
       RETURNING id, name, email, type, agency_id, created_at`,
      [uuidv4(), name, email, password_hash, agency_id]
    );

    const client = result.rows[0];

    return res.status(201).json({
      message: `Client "${name}" invited successfully`,
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        type: client.type,
        agency_id: client.agency_id,
      },
    });
  } catch (err) {
    console.error('Invite error:', err.message);
    return res.status(500).json({ error: 'Invite failed' });
  }
});

module.exports = router;
