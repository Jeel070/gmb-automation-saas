'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { tenantAPI, postsAPI } from '../../lib/api';

function StatCard({ label, value, color }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value ?? '—'}</div>
      <div className="text-sm mt-1 font-medium opacity-80">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-gray-100 text-gray-600',
    scheduled: 'bg-blue-100 text-blue-700',
    published: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

export default function DashboardHome() {
  const [stats, setStats] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [statsData, postsData] = await Promise.all([
          tenantAPI.stats(),
          postsAPI.list(),
        ]);
        setStats(statsData.stats);
        setRecentPosts(postsData.posts.slice(0, 5));
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your GMB post activity</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total Posts" value={stats?.total} color="purple" />
        <StatCard label="Draft" value={stats?.draft} color="gray" />
        <StatCard label="Scheduled" value={stats?.scheduled} color="blue" />
        <StatCard label="Published" value={stats?.published} color="green" />
        <StatCard label="Failed" value={stats?.failed} color="red" />
      </div>

      {/* Recent posts */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Posts</h2>
          <Link href="/dashboard/posts" className="text-sm text-blue-600 hover:underline">
            View all →
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No posts yet.{' '}
            <Link href="/dashboard/posts/new" className="text-blue-600 hover:underline">
              Create your first post
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3 text-left">Title</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Scheduled At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPosts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/posts/${post.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block max-w-xs"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {new Date(post.scheduled_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3">
        <Link
          href="/dashboard/posts/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Create New Post
        </Link>
        <Link
          href="/dashboard/posts?status=failed"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          View Failed Posts
        </Link>
      </div>
    </div>
  );
}
