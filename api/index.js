require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('../src/routes/auth');
const tenantRoutes = require('../src/routes/tenant');
const postRoutes = require('../src/routes/posts');
const generateRoutes = require('../src/routes/generate');
const gmbRoutes = require('../src/routes/gmb');

// Scheduler
const { startScheduler } = require('../src/scheduler/processScheduledPosts');

const app = express();

// ─────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────

// Allow requests from the deployed frontend URL.
// FRONTEND_URL env var → specific origin in production.
// Falls back to * (all origins) for local dev or if not set.
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: 'GMB Automation SaaS API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      tenant: '/api/tenant',
      posts: '/api/posts',
    },
  });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
// Generate must be mounted BEFORE /api/posts so it isn't swallowed by the :id param
app.use('/api/posts/generate', generateRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/gmb', gmbRoutes);

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────────
// Start Server (only when running locally, not on Vercel)
// ─────────────────────────────────────────────
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`\n GMB Automation API running on http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // start BullMQ worker (processes jobs from Redis queue)
    require('../src/scheduler/worker');

    // register the repeatable poll job + run once immediately
    await startScheduler();
  });
}

// Export for Vercel serverless
module.exports = app;
