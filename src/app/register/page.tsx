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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('لطفاً یک آدرس ایمیل معتبر وارد کنید'),
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
  full_name: z.string().min(2, 'نام کامل باید حداقل ۲ کاراکتر باشد'),
  password: z.string().min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'manager', 'user']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "رمز عبور و تأیید آن یکسان نیستند",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'user',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authAPI.register({
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        password: data.password,
        role: data.role,
      });
      
      toast.success('ثبت‌نام با موفقیت انجام شد. لطفاً وارد شوید');
      router.push('/login');
    } catch (error: any) {
      const errorMessage = error.message || 'ثبت‌نام ناموفق بود';
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
            ایجاد حساب کاربری جدید
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>ثبت‌نام</CardTitle>
            <CardDescription>
              اطلاعات زیر را برای ایجاد حساب کاربری جدید تکمیل کنید
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
                <Label htmlFor="full_name">نام کامل</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="نام کامل خود را وارد کنید"
                  {...register('full_name')}
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500">{errors.full_name.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="نام کاربری خود را وارد کنید"
                  {...register('username')}
                  className={errors.username ? 'border-red-500' : ''}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>
              
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
                <Label htmlFor="role">نقش کاربری</Label>
                <Select onValueChange={(value) => setValue('role', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="نقش کاربری را انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">کاربر عادی</SelectItem>
                    <SelectItem value="manager">مدیر</SelectItem>
                    <SelectItem value="admin">ادمین</SelectItem>
                  </SelectContent>
                </Select>
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
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تأیید رمز عبور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="رمز عبور را مجدداً وارد کنید"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                    در حال ایجاد حساب...
                  </>
                ) : (
                  'ایجاد حساب کاربری'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            قبلاً ثبت‌نام کرده‌اید؟{' '}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              وارد شوید
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}