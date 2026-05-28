const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// single shared Redis connection for the whole app
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('connect', () => console.log('[Redis] Connected'));
connection.on('error', (err) => console.error('[Redis] Error:', err.message));

const postQueue = new Queue('post-scheduler', { connection });

module.exports = { postQueue, connection };
