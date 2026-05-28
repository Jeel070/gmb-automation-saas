const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { runScheduler, processPost } = require('./processScheduledPosts');
const db = require('../db');

// worker picks up jobs from the 'post-scheduler' queue
const worker = new Worker(
  'post-scheduler',
  async (job) => {
    // repeatable poll — finds all due posts in DB and processes them
    if (job.name === 'poll-due-posts') {
      return await runScheduler();
    }

    // individual delayed job — fires at the exact scheduled_at time for a post
    if (job.name === 'publish-post') {
      const { postId } = job.data;

      const result = await db.query(
        'SELECT * FROM posts WHERE id = $1 AND status = $2',
        [postId, 'scheduled']
      );

      if (result.rows.length === 0) {
        console.log(`[BullMQ] Post ${postId} not found or already processed — skipping`);
        return { skipped: true };
      }

      return await processPost(result.rows[0]);
    }
  },
  { connection, concurrency: 5 }
);

worker.on('completed', (job) => {
  console.log(`[BullMQ] Job "${job.name}" (${job.id}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job "${job.name}" (${job.id}) failed: ${err.message}`);
});

module.exports = worker;
