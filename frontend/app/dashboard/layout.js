'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

function NavLink({ href, children }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('gmb_token');
    const userStr = localStorage.getItem('gmb_user');
    if (!token || !userStr) {
      router.replace('/login');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  function logout() {
    localStorage.removeItem('gmb_token');
    localStorage.removeItem('gmb_user');
    router.replace('/login');
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="w-60 bg-gray-900 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="text-white font-bold text-base">GMB Automation</div>
          <div className="text-gray-400 text-xs mt-0.5">Multi-tenant Platform</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/dashboard">
            {/* Dashboard icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </NavLink>

          <NavLink href="/dashboard/posts">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Posts
          </NavLink>

          <NavLink href="/dashboard/posts/new">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Post
          </NavLink>

          {/* Agency-only: Invite clients */}
          {user.type === 'agency' && (
            <NavLink href="/dashboard/invite">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Invite Client
            </NavLink>
          )}
        </nav>

        {/* User info + logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="px-2 mb-3">
            <div className="text-white text-sm font-medium truncate">{user.name}</div>
            <div className="text-gray-400 text-xs truncate">{user.email}</div>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
              user.type === 'agency'
                ? 'bg-purple-900 text-purple-200'
                : 'bg-gray-800 text-gray-300'
            }`}>
              {user.type}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
