'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAuth();
    };
    
    initializeAuth();
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setAuthTimeout(true);
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // If timeout occurs, force redirect to login
  useEffect(() => {
    if (authTimeout) {
      router.push('/login');
    }
  }, [authTimeout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">در حال بارگذاری...</p>
        {authTimeout && (
          <p className="text-sm text-red-500 mt-2">
            در حال انتقال به صفحه ورود...
          </p>
        )}
      </div>
    </div>
  );
}