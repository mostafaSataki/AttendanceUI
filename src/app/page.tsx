'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and redirect accordingly
    const isAuthenticated = authHelpers.isAuthenticated();
    
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">در حال بارگذاری...</p>
      </div>
    </div>
  );
}