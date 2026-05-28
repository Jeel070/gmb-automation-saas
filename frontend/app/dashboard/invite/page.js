'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../../../lib/api';

export default function InviteClientPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authAPI.invite(form);
      setSuccess(`Client "${data.client.name}" invited! Email: ${data.client.email}`);
      setForm({ name: '', email: '', password: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <Link href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 mb-6 block">
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite a Client</h1>
      <p className="text-sm text-gray-500 mb-8">
        Create a client sub-tenant under your agency. They will only see their own posts.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client / Business Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Pizza Palace"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="client@business.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Min 6 characters"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="pt-2 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <span className="spinner" />}
            {loading ? 'Inviting...' : 'Send Invite'}
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
