'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const user = authHelpers.getCurrentUser();

  useEffect(() => {
    if (!authHelpers.isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleGoBack = () => {
    router.back();
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'ادمین';
      case 'manager': return 'مدیر';
      case 'user': return 'کاربر';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              دسترسی غیرمجاز
            </CardTitle>
            <CardDescription>
              شما مجوز دسترسی به این صفحه را ندارید.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>نقش شما:</strong> {getRoleName(user?.role || '')}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                این صفحه نیاز به مجوزهای بیشتری دارد که شما در حال حاضر ندارید.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                بازگشت
              </Button>
              <Button
                onClick={handleGoToDashboard}
              >
                رفتن به داشبورد
              </Button>
            </div>
            
            <div className="text-xs text-gray-500">
              اگر فکر می‌کنید این یک خطاست، لطفاً با مدیر سیستم تماس بگیرید.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}