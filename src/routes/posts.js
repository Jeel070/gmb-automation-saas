const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { processPost } = require('../scheduler/processScheduledPosts');
const { postQueue } = require('../scheduler/queue');

const router = express.Router();
router.use(authMiddleware);

// Create a post.
router.post('/', async (req, res) => {
  const { title, content, image_url, scheduled_at } = req.body;
  const tenant_id = req.user.tenant_id;

  if (!title || !content || !scheduled_at) {
    return res.status(400).json({ error: 'title, content, and scheduled_at are required' });
  }

  const scheduledDate = new Date(scheduled_at);
  if (isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ error: 'scheduled_at must be a valid ISO date string' });
  }

  // Future time = scheduled, past time = draft.
  const status = scheduledDate > new Date() ? 'scheduled' : 'draft';

  try {
    const result = await db.query(
      `INSERT INTO posts (id, tenant_id, title, content, image_url, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [uuidv4(), tenant_id, title, content, image_url || null, scheduledDate, status]
    );

    const post = result.rows[0];

    // Queue publish job for scheduled time.
    if (status === 'scheduled') {
      const delay = Math.max(0, scheduledDate.getTime() - Date.now());
      await postQueue.add('publish-post', { postId: post.id }, {
        delay,
        attempts: 3,
        backoff: { type: 'fixed', delay: 60 * 1000 },
        removeOnComplete: 5,
        removeOnFail: 5,
      });
    }

    return res.status(201).json({
      message: 'Post created',
      post,
    });
  } catch (err) {
    console.error('Create post error:', err.message);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// List posts for current tenant.
router.get('/', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { status } = req.query;

  let queryText = `
    SELECT id, title, content, image_url, scheduled_at, status, published_at, retry_count, created_at
    FROM posts
    WHERE tenant_id = $1
  `;
  const params = [tenant_id];

  // Optional status filter.
  if (status) {
    params.push(status);
    queryText += ` AND status = $${params.length}`;
  }

  queryText += ' ORDER BY scheduled_at DESC';

  try {
    const result = await db.query(queryText, params);
    return res.status(200).json({ posts: result.rows });
  } catch (err) {
    console.error('List posts error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/:id', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM posts WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(200).json({ post: result.rows[0] });
  } catch (err) {
    console.error('Get post error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post while still editable.
router.patch('/:id', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;
  const { title, content, image_url, scheduled_at } = req.body;

  try {
    // Check ownership and status first.
    const existing = await db.query(
      'SELECT id, status FROM posts WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (['published', 'failed'].includes(existing.rows[0].status)) {
      return res.status(400).json({ error: 'Cannot edit a published or failed post' });
    }

    const updates = [];
    const params = [];

    if (title) { params.push(title); updates.push(`title = $${params.length}`); }
    if (content) { params.push(content); updates.push(`content = $${params.length}`); }
    if (image_url !== undefined) { params.push(image_url); updates.push(`image_url = $${params.length}`); }
    if (scheduled_at) {
      const d = new Date(scheduled_at);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid scheduled_at' });
      params.push(d);
      updates.push(`scheduled_at = $${params.length}`);
      params.push(d > new Date() ? 'scheduled' : 'draft');
      updates.push(`status = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(new Date());
    updates.push(`updated_at = $${params.length}`);
    params.push(id);
    params.push(tenant_id);

    const result = await db.query(
      `UPDATE posts SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
       RETURNING *`,
      params
    );

    const updated = result.rows[0];

    // Re-queue if post is still scheduled.
    if (scheduled_at && updated.status === 'scheduled') {
      const delay = Math.max(0, new Date(updated.scheduled_at).getTime() - Date.now());
      await postQueue.add('publish-post', { postId: updated.id }, {
        delay,
        attempts: 3,
        backoff: { type: 'fixed', delay: 60 * 1000 },
        removeOnComplete: 5,
        removeOnFail: 5,
      });
    }

    return res.status(200).json({ message: 'Post updated', post: updated });
  } catch (err) {
    console.error('Update post error:', err.message);
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/:id', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM posts WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error:', err.message);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Trigger immediate publish for one post.
router.post('/:id/publish-now', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    const existing = await db.query(
      'SELECT * FROM posts WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = existing.rows[0];
    const result = await processPost(post);

    return res.status(200).json({ message: 'Publish attempt complete', result });
  } catch (err) {
    console.error('Manual publish error:', err.message);
    return res.status(500).json({ error: 'Failed to publish post' });
  }
});

// Fetch publish logs for one post.
router.get('/:id/logs', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { id } = req.params;

  try {
    // Confirm tenant owns this post.
    const post = await db.query(
      'SELECT id FROM posts WHERE id = $1 AND tenant_id = $2',
      [id, tenant_id]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const logs = await db.query(
      'SELECT * FROM publish_logs WHERE post_id = $1 ORDER BY attempted_at DESC',
      [id]
    );

    return res.status(200).json({ logs: logs.rows });
  } catch (err) {
    console.error('Logs fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
