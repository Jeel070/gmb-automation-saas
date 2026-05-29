const SUCCESS_RATE = 0.85; // 85% chance of success (to test retry logic)

async function mockPublishToGMB(post) {
  // Simulate network delay.
  const delay = Math.floor(Math.random() * 600) + 200;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const isSuccess = Math.random() < SUCCESS_RATE;

  if (isSuccess) {
    // Return a fake GMB post id.
    const gmb_post_id = `GMB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    console.log(`[MockGMB] ✓ Post "${post.title}" published. GMB Post ID: ${gmb_post_id}`);

    return {
      success: true,
      message: `Post published to GMB successfully`,
      gmb_post_id,
    };
  } else {
    const errors = [
      'GMB API rate limit exceeded — retry later',
      'GMB location not verified',
      'GMB API timeout — connection refused',
      'GMB account suspended temporarily',
    ];

    const message = errors[Math.floor(Math.random() * errors.length)];

    console.log(`[MockGMB] ✗ Post "${post.title}" failed: ${message}`);

    return {
      success: false,
      message,
    };
  }
}

module.exports = { mockPublishToGMB };
