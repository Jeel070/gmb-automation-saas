const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Realistic GMB failure messages
const FAILURE_REASONS = [
  'GMB service unavailable',
  'Rate limit exceeded — too many requests',
  'Location ID not found or not verified',
  'Post content violates GMB community guidelines',
];

// ─────────────────────────────────────────────
// POST /api/gmb/publish
// Mock Google My Business publish endpoint.
// In production, this would call the Google Business Profile API.
//
// Body: { tenant_id, post_title, post_content, location_id }
// Returns: 90% success, 10% failure (simulates real-world GMB errors)
// ─────────────────────────────────────────────
router.post('/publish', authMiddleware, async (req, res) => {
  const { post_title, post_content, location_id } = req.body;

  if (!post_title || !post_content) {
    return res.status(400).json({ error: 'post_title and post_content are required' });
  }

  // Simulate GMB API network latency (200–900ms)
  const delay = Math.floor(Math.random() * 700) + 200;
  await new Promise((r) => setTimeout(r, delay));

  // 90% success rate, 10% failure — matches real-world GMB reliability
  const isSuccess = Math.random() < 0.9;

  if (isSuccess) {
    const gmb_post_id = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return res.status(200).json({
      status: 'published',
      gmb_post_id,
      published_at: new Date().toISOString(),
      location_id: location_id || 'locations/ChIJ_default_001',
    });
  }

  const reason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];

  return res.status(503).json({
    status: 'failed',
    error: reason,
  });
});

module.exports = router;
