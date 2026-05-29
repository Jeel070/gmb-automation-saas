'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { postsAPI } from '../../../../lib/api';

const POST_TYPES = [
  { value: 'whats-new', label: "What's New" },
  { value: 'offer', label: 'Offer' },
  { value: 'event', label: 'Event' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'casual', label: 'Casual' },
];

// Default to one hour from now.
function defaultScheduledAt() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  // datetime-local expects YYYY-MM-DDTHH:MM.
  return d.toISOString().slice(0, 16);
}

export default function NewPostPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    title: '',
    content: '',
    image_url: '',
    scheduled_at: defaultScheduledAt(),
  });

  const [ai, setAi] = useState({
    business_name: '',
    location: '',
    post_type: 'whats-new',
    tone: 'friendly',
  });

  const [generating, setGenerating] = useState(false);
  const [aiSource, setAiSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');

  async function handleGenerate(e) {
    e.preventDefault();
    setAiError('');
    setAiSource('');

    if (!ai.business_name || !ai.location) {
      setAiError('Business name and location are required for AI generation');
      return;
    }

    setGenerating(true);
    try {
      const data = await postsAPI.generate(ai);
      // Fill title/content with generated values.
      setForm((prev) => ({
        ...prev,
        title: data.title,
        content: data.content,
      }));
      setAiSource(data.source === 'mock'
        ? '✓ Mock content generated (add OPENAI_API_KEY to use real AI)'
        : '✓ Generated with GPT-4o-mini');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await postsAPI.create({
        ...form,
        image_url: form.image_url || undefined,
      });
      router.push('/dashboard/posts');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard/posts" className="text-sm text-gray-500 hover:text-blue-600 mb-6 block">
        ← Back to posts
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Post</h1>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="font-semibold text-gray-900">AI Post Generator</h2>
          <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            GPT-4o-mini
          </span>
        </div>

        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                value={ai.business_name}
                onChange={(e) => setAi({ ...ai, business_name: e.target.value })}
                placeholder="Pizza Palace"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                value={ai.location}
                onChange={(e) => setAi({ ...ai, location: e.target.value })}
                placeholder="New York, NY"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Post Type</label>
              <select
                value={ai.post_type}
                onChange={(e) => setAi({ ...ai, post_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {POST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
              <select
                value={ai.tone}
                onChange={(e) => setAi({ ...ai, tone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {aiError && (
            <div className="text-red-600 text-xs">{aiError}</div>
          )}
          {aiSource && (
            <div className="text-green-700 text-xs">{aiSource}</div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <span className="spinner" />
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Post
              </>
            )}
          </button>
        </form>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900 mb-1">Post Details</h2>

        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Post title (max 500 chars)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Content <span className="text-red-500">*</span>
            </label>
            <span className={`text-xs ${form.content.length > 1400 ? 'text-red-500' : 'text-gray-400'}`}>
              {form.content.length} / 1500
            </span>
          </div>
          <textarea
            required
            rows={8}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Your GMB post content... (edit AI-generated content above, or write your own)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Schedule Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Future dates will be auto-scheduled. Past dates will be set as draft.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <span className="spinner" />}
            {submitting ? 'Saving...' : 'Save & Schedule'}
          </button>
          <Link
            href="/dashboard/posts"
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
