const db = require('../db');
const { mockPublishToGMB } = require('../services/mockGMBPublish');
const { v4: uuidv4 } = require('uuid');

const MAX_RETRIES = 3;

// handles a single post — publishes to mock GMB, updates DB, logs result
// used by the worker and the manual /publish-now endpoint
async function processPost(post) {
  const publishResult = await mockPublishToGMB(post);

  if (publishResult.success) {
    // Mark as published
    await db.query(
      `UPDATE posts
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [post.id]
    );

    // Log success
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

    // Mark as failed if max retries reached, otherwise leave as scheduled for next run
    await db.query(
      `UPDATE posts
       SET status = $1, retry_count = $2, updated_at = NOW()
       WHERE id = $3`,
      [isFinalFailure ? 'failed' : 'scheduled', newRetryCount, post.id]
    );

    // Log failure
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

// finds all posts due right now and processes them one by one
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

    // Process each post sequentially to avoid overloading the mock API
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

// starts the BullMQ scheduler — registers a repeatable poll job every 60s
async function startScheduler() {
  const { postQueue } = require('./queue');

  // remove any stale repeatable jobs from a previous run to avoid duplicates
  const existing = await postQueue.getRepeatableJobs();
  for (const job of existing) {
    await postQueue.removeRepeatableByKey(job.key);
  }

  // repeatable job — polls DB for due posts every 60 seconds
  await postQueue.add('poll-due-posts', {}, {
    repeat: { every: 60 * 1000 },
    removeOnComplete: 10,
    removeOnFail: 5,
  });

  console.log('[BullMQ] Scheduler registered — polling every 60s');

  // run once immediately so posts due on startup aren't missed
  await runScheduler();
}

module.exports = { runScheduler, processPost, startScheduler };
