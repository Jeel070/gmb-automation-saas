const express = require('express');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Tone hints for prompt building.
const TONE_HINTS = {
  professional: 'Use a professional and trustworthy tone.',
  friendly: 'Use a warm, friendly, and welcoming tone.',
  urgent: 'Use an urgent tone — create a sense of FOMO and limited time.',
  casual: 'Use a casual, relaxed tone like talking to a friend.',
};

// Mock content used when no OpenAI key is set or API fails.
const MOCK = {
  'whats-new': (biz, loc) => ({
    title: `Exciting Update from ${biz}!`,
    content: `We've got some exciting news to share at ${biz} here in ${loc}!\n\nOur team has been working hard behind the scenes and we're thrilled to finally let you in on what's been happening. We've been listening to your feedback and making improvements to serve you better.\n\nWhether you're a long-time customer or hearing about us for the first time — this is the perfect moment to visit.\n\n📍 Come see us in ${loc} today. We'd love to share this update with you in person. Call us or stop by anytime!`,
  }),
  'offer': (biz, loc) => ({
    title: `🎉 Special Offer at ${biz} — Limited Time!`,
    content: `Great news for everyone in ${loc}! ${biz} is running an exclusive promotion and we don't want you to miss it.\n\nFor a limited time, we're offering an amazing deal for both new and returning customers. This is our way of saying thank you for your incredible support.\n\n✅ Available for all customers\n✅ No hidden terms or conditions\n✅ While supplies last\n\nDon't wait — this offer expires soon! Visit ${biz} in ${loc} today and mention this post at the counter to redeem. Questions? Give us a call — we're happy to help!`,
  }),
  'event': (biz, loc) => ({
    title: `You're Invited! Special Event at ${biz} 🎊`,
    content: `📅 Save the date — something special is happening at ${biz} in ${loc}!\n\nWe're hosting an event and the whole community is invited. Bring your family and friends — the more the merrier! We've put together a memorable experience filled with great moments and good energy.\n\nWhat to expect:\n• Fun for everyone\n• Special surprises on the day\n• A chance to connect with the ${loc} community\n\n📍 ${biz}, ${loc}\n\nSpace is limited! Follow us for the exact date and time, or contact us to RSVP early. We look forward to celebrating with you! 🎉`,
  }),
};

router.post('/', authMiddleware, async (req, res) => {
  const { business_name, location, post_type, tone } = req.body;

  if (!business_name || !location || !post_type || !tone) {
    return res.status(400).json({
      error: 'business_name, location, post_type, and tone are all required',
    });
  }

  const validTypes = ['whats-new', 'offer', 'event'];
  if (!validTypes.includes(post_type)) {
    return res.status(400).json({
      error: `post_type must be one of: ${validTypes.join(', ')}`,
    });
  }

  // Try real AI first when key is available.
  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const typeLabel = {
        'whats-new': "What's New",
        offer: 'Offer',
        event: 'Event',
      }[post_type];

      const toneHint = TONE_HINTS[tone] || `Tone: ${tone}.`;

      const prompt = [
        `Write a Google My Business '${typeLabel}' post for ${business_name} located in ${location}.`,
        toneHint,
        'Keep it under 1500 characters total.',
        'Include a clear call to action at the end.',
        'Return ONLY a JSON object with two fields: "title" (max 100 chars) and "content" (max 1400 chars).',
      ].join(' ');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.75,
      });

      const generated = JSON.parse(completion.choices[0].message.content);

      return res.status(200).json({
        title: generated.title,
        content: generated.content,
        source: 'openai',
      });
    } catch (err) {
      console.error('[Generate] OpenAI error — falling back to mock:', err.message);
      // Fallback to mock response below.
    }
  }

  // Use mock output if OpenAI is disabled/unavailable.
  const { title, content } = MOCK[post_type](business_name, location);

  // Keep a tiny delay so UI loading state is visible.
  await new Promise((r) => setTimeout(r, 800));

  return res.status(200).json({
    title,
    content,
    source: 'mock',
    note: 'Add OPENAI_API_KEY to .env to enable real AI generation (gpt-4o-mini)',
  });
});

module.exports = router;
