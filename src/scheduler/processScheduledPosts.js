const db = require('../db');
const { mockPublishToGMB } = require('../services/mockGMBPublish');
const { v4: uuidv4 } = require('uuid');

const MAX_RETRIES = 3;

// Process one post publish attempt.
async function processPost(post) {
  const publishResult = await mockPublishToGMB(post);

  if (publishResult.success) {
    // Mark published.
    await db.query(
      `UPDATE posts
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [post.id]
    );

    // Save success log.
    await db.query(
      `INSERT INTO publish_logs (id, post_id, tenant_id, status, message)
       VALUES ($1, $2, $3, 'success', $4)`,
      [uuidv4(), post.id, post.tenant_id, publishResult.message]
    );

    console.log(`[Scheduler] Post ${post.id} published successfully`);
    return { postId: post.id, status: 'published', message: publishResult.message };

  } else {
    const newRetryCount = (post.retry_count || 0) + 1;
    const isFinalFailure = newRetryCount >= MAX_RETRIES;

    // Keep scheduled until retry limit, otherwise mark failed.
    await db.query(
      `UPDATE posts
       SET status = $1, retry_count = $2, updated_at = NOW()
       WHERE id = $3`,
      [isFinalFailure ? 'failed' : 'scheduled', newRetryCount, post.id]
    );

    // Save failure log.
    await db.query(
      `INSERT INTO publish_logs (id, post_id, tenant_id, status, message)
       VALUES ($1, $2, $3, 'failed', $4)`,
      [uuidv4(), post.id, post.tenant_id, publishResult.message]
    );

    const statusMsg = isFinalFailure
      ? `Failed after ${MAX_RETRIES} retries — marking as failed`
      : `Attempt ${newRetryCount}/${MAX_RETRIES} failed — will retry`;

    console.log(`[Scheduler] Post ${post.id}: ${statusMsg}`);
    return { postId: post.id, status: isFinalFailure ? 'failed' : 'retrying', message: publishResult.message };
  }
}

// Pick due posts and process sequentially.
async function runScheduler() {
  console.log(`[Scheduler] Running at ${new Date().toISOString()}`);

  try {
    const result = await db.query(
      `SELECT * FROM posts
       WHERE status = 'scheduled'
         AND scheduled_at <= NOW()
         AND retry_count < $1
       ORDER BY scheduled_at ASC
       LIMIT 50`,
      [MAX_RETRIES]
    );

    const duePosts = result.rows;

    if (duePosts.length === 0) {
      console.log('[Scheduler] No posts due for publishing');
      return { processed: 0 };
    }

    console.log(`[Scheduler] Found ${duePosts.length} post(s) to publish`);

    // Process sequentially to keep load predictable.
    const results = [];
    for (const post of duePosts) {
      const r = await processPost(post);
      results.push(r);
    }

    return { processed: duePosts.length, results };
  } catch (err) {
    console.error('[Scheduler] Error:', err.message);
    return { processed: 0, error: err.message };
  }
}

// Register repeat scheduler job and run one pass now.
async function startScheduler() {
  const { postQueue } = require('./queue');

  // Clear old repeat jobs to avoid duplicates.
  const existing = await postQueue.getRepeatableJobs();
  for (const job of existing) {
    await postQueue.removeRepeatableByKey(job.key);
  }

  // Poll due posts every 60 seconds.
  await postQueue.add('poll-due-posts', {}, {
    repeat: { every: 60 * 1000 },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  console.log('[BullMQ] Scheduler registered — polling every 60s');

  // Run once on startup.
  await runScheduler();
}

module.exports = { runScheduler, processPost, startScheduler };
