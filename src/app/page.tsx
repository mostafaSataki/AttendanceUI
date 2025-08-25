'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { setState } = useAuthStore();

  useEffect(() => {
    // Simple check - if there's a token in localStorage, consider authenticated
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Set authentication state
      setState({
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      router.push('/dashboard');
    } else {
      // No token, redirect to login
      router.push('/login');
    }
  }, [router, setState]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">در حال بارگذاری...</p>
      </div>
    </div>
  );
}