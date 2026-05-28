'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { postsAPI } from '../../../lib/api';

const STATUS_FILTERS = ['all', 'draft', 'scheduled', 'published', 'failed'];

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

export default function PostsListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400 text-sm">Loading...</div>}>
      <PostsList />
    </Suspense>
  );
}

function PostsList() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const statusParam = searchParams.get('status') || 'all';

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  async function load(status) {
    setLoading(true);
    setError('');
    try {
      const data = await postsAPI.list(status === 'all' ? '' : status);
      setPosts(data.posts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(statusParam);
  }, [statusParam]);

  function filterChange(status) {
    router.push(status === 'all' ? '/dashboard/posts' : `/dashboard/posts?status=${status}`);
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete post "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await postsAPI.delete(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-1">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Post
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => filterChange(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              statusParam === s
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Posts table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-sm mb-3">No posts found</div>
            <Link
              href="/dashboard/posts/new"
              className="text-blue-600 text-sm hover:underline"
            >
              Create your first post →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Title</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Scheduled At</th>
                <th className="px-5 py-3 text-left">Published At</th>
                <th className="px-5 py-3 text-left">Retries</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/posts/${post.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 block truncate max-w-xs"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {new Date(post.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {post.published_at ? new Date(post.published_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-center">
                    {post.retry_count}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/posts/${post.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                      {['draft', 'scheduled'].includes(post.status) && (
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          disabled={deleting === post.id}
                          className="text-xs text-red-500 hover:underline disabled:opacity-40"
                        >
                          {deleting === post.id ? '...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
