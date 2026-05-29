require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('../src/routes/auth');
const tenantRoutes = require('../src/routes/tenant');
const postRoutes = require('../src/routes/posts');
const generateRoutes = require('../src/routes/generate');
const gmbRoutes = require('../src/routes/gmb');
const { startScheduler } = require('../src/scheduler/processScheduledPosts');

const app = express();

// Allow requests from frontend URL in production, fallback to * in local dev.
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
// Keep this before /api/posts so it is not treated as :id.
app.use('/api/posts/generate', generateRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/gmb', gmbRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server locally only.
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`\n GMB Automation API running on http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Start BullMQ worker.
    require('../src/scheduler/worker');

    // Register repeat job and run one pass on boot.
    await startScheduler();
  });
}

module.exports = app;
