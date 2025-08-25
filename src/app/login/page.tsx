'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authAPI } from '@/lib/api';
import { authHelpers } from '@/lib/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('لطفاً یک آدرس ایمیل معتبر وارد کنید'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAPI.login(data.email, data.password);
      
      // Save auth data
      authHelpers.login(response.access_token, {
        id: response.user_id,
        email: data.email,
        username: response.username || data.email,
        full_name: response.full_name || '',
        role: response.role || 'user',
        is_active: true,
      });
      
      // Set token in cookie for middleware
      document.cookie = `access_token=${response.access_token}; path=/; max-age=86400; secure; samesite=strict`;
      
      toast.success('ورود با موفقیت انجام شد');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || 'ورود به سیستم ناموفق بود';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            سیستم حضور و غیاب کارکنان
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            برای ورود به حساب کاربری خود، اطلاعات را وارد کنید
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>ورود به سیستم</CardTitle>
            <CardDescription>
              برای دسترسی به سیستم، ایمیل و رمز عبور خود را وارد کنید
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ایمیل خود را وارد کنید"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="رمز عبور خود را وارد کنید"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    در حال ورود...
                  </>
                ) : (
                  'ورود به سیستم'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            حساب کاربری ندارید؟{' '}
            <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              ثبت‌نام کنید
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}