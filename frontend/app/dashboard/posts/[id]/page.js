'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { postsAPI } from '../../../../lib/api';

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

export default function PostDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [publishMsg, setPublishMsg] = useState('');

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [postData, logsData] = await Promise.all([
          postsAPI.get(id),
          postsAPI.logs(id),
        ]);
        setPost(postData.post);
        setLogs(logsData.logs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handlePublishNow() {
    setPublishing(true);
    setPublishMsg('');
    setError('');

    try {
      const result = await postsAPI.publishNow(id);
      setPublishMsg(`Result: ${result.result?.status || 'done'} — ${result.result?.message || ''}`);

      // Refresh post and logs
      const [postData, logsData] = await Promise.all([
        postsAPI.get(id),
        postsAPI.logs(id),
      ]);
      setPost(postData.post);
      setLogs(logsData.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-400 text-sm">Loading post...</div>
    );
  }

  if (error && !post) {
    return (
      <div className="p-8">
        <div className="text-red-600 text-sm mb-4">{error}</div>
        <Link href="/dashboard/posts" className="text-blue-600 text-sm hover:underline">← Back to posts</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Back */}
      <Link href="/dashboard/posts" className="text-sm text-gray-500 hover:text-blue-600 mb-6 block">
        ← Back to posts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={post.status} />
            <span className="text-sm text-gray-500">
              Retry count: {post.retry_count} / 3
            </span>
          </div>
        </div>

        {/* Retry button — shown when failed and retries remaining */}
        {(post.status === 'failed' || post.status === 'scheduled') && (
          <button
            onClick={handlePublishNow}
            disabled={publishing}
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {publishing && <span className="spinner" />}
            {publishing ? 'Publishing...' : post.status === 'failed' ? 'Retry Publish' : 'Publish Now'}
          </button>
        )}
      </div>

      {/* Feedback */}
      {publishMsg && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          {publishMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Post content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Post Content</h2>
        <div className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>

        {post.image_url && (
          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-1">Image URL</div>
            <a href={post.image_url} target="_blank" rel="noreferrer"
              className="text-sm text-blue-600 hover:underline break-all">
              {post.image_url}
            </a>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-400">Scheduled At</dt>
            <dd className="text-gray-900 mt-0.5">{new Date(post.scheduled_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Published At</dt>
            <dd className="text-gray-900 mt-0.5">{post.published_at ? new Date(post.published_at).toLocaleString() : '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Created</dt>
            <dd className="text-gray-900 mt-0.5">{new Date(post.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Post ID</dt>
            <dd className="text-gray-500 mt-0.5 text-xs font-mono truncate">{post.id}</dd>
          </div>
        </dl>
      </div>

      {/* Publish logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Publish Log</h2>
        </div>

        {logs.length === 0 ? (
          <div className="p-6 text-sm text-gray-400 text-center">No publish attempts yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${
                  log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{log.message}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.attempted_at).toLocaleString()}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  log.status === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
