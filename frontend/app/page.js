'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Root page: redirect to /dashboard if logged in, otherwise /login
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('gmb_token');
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  );
}
