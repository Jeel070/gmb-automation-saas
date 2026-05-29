const express = require('express');
const db = require('../db');
const { authMiddleware, agencyOnly } = require('../middleware/auth');

const router = express.Router();
// Current tenant profile.
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, type, agency_id, created_at FROM tenants WHERE id = $1',
      [req.user.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    return res.status(200).json({ tenant: result.rows[0] });
  } catch (err) {
    console.error('Profile error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Post counts by status for current tenant.
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*)                                    AS total,
         COUNT(*) FILTER (WHERE status = 'draft')     AS draft,
         COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
         COUNT(*) FILTER (WHERE status = 'published') AS published,
         COUNT(*) FILTER (WHERE status = 'failed')    AS failed
       FROM posts
       WHERE tenant_id = $1`,
      [req.user.tenant_id]
    );

    return res.status(200).json({ stats: result.rows[0] });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Agency-only list of client tenants.
router.get('/clients', authMiddleware, agencyOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, type, created_at
       FROM tenants
       WHERE agency_id = $1
       ORDER BY created_at DESC`,
      [req.user.tenant_id]
    );

    return res.status(200).json({ clients: result.rows });
  } catch (err) {
    console.error('Clients fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

module.exports = router;
