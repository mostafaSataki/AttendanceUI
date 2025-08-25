'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/store/auth';
import { 
  Users, 
  Building2, 
  Clock, 
  Calendar, 
  FileText, 
  Plane,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalPersonnel: number;
  activePersonnel: number;
  totalOrgUnits: number;
  totalShifts: number;
  pendingLeaveRequests: number;
  pendingMissionRequests: number;
  todayAttendance: number;
  lateArrivals: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalPersonnel: 0,
    activePersonnel: 0,
    totalOrgUnits: 0,
    totalShifts: 0,
    pendingLeaveRequests: 0,
    pendingMissionRequests: 0,
    todayAttendance: 0,
    lateArrivals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to get dashboard stats
    const fetchStats = async () => {
      try {
        // In a real app, you would fetch this data from your API
        // For now, we'll use mock data
        setTimeout(() => {
          setStats({
            totalPersonnel: 156,
            activePersonnel: 142,
            totalOrgUnits: 12,
            totalShifts: 8,
            pendingLeaveRequests: 5,
            pendingMissionRequests: 3,
            todayAttendance: 128,
            lateArrivals: 12,
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, description, trend }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    description?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">در حال بارگذاری داشبورد...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout>
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            خوش آمدید، {user?.full_name}!
          </h1>
          <p className="text-muted-foreground">
            آخرین وضعیت سیستم حضور و غیاب را در اینجا مشاهده کنید.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {user?.role === 'admin' ? 'ادمین' : 
           user?.role === 'manager' ? 'مدیر' : 'کاربر'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="تعداد پرسنل"
          value={stats.totalPersonnel}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.activePersonnel} فعال`}
        />
        <StatCard
          title="واحدهای سازمانی"
          value={stats.totalOrgUnits}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="شیفت‌های فعال"
          value={stats.totalShifts}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="حضور امروز"
          value={stats.todayAttendance}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          description={`${stats.lateArrivals} تأخیر`}
        />
      </div>

      {/* Pending Requests */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              درخواست‌های مرخصی در انتظار بررسی
            </CardTitle>
            <CardDescription>
              مرخصی‌هایی که نیاز به تأیید شما دارند
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingLeaveRequests}</div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مرخصی استحقاقی</span>
                <Badge variant="outline">۲</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مرخصی استعلاجی</span>
                <Badge variant="outline">۱</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مرخصی بدون حقوق</span>
                <Badge variant="outline">۲</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              درخواست‌های مأموریت در انتظار بررسی
            </CardTitle>
            <CardDescription>
              مأموریت‌هایی که نیاز به تأیید شما دارند
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingMissionRequests}</div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مأموریت کاری</span>
                <Badge variant="outline">۲</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">دوره آموزشی</span>
                <Badge variant="outline">۱</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>فعالیت‌های اخیر</CardTitle>
          <CardDescription>
            آخرین فعالیت‌های حضور و غیاب و درخواست‌ها
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">احمد محمدی وارد سیستم شد</p>
                <p className="text-xs text-muted-foreground">۲ دقیقه پیش</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">فاطمه علی‌زاده درخواست مرخصی ثبت کرد</p>
                <p className="text-xs text-muted-foreground">۱۵ دقیقه پیش</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">رضا حسینی با تأخیر حضور یافت</p>
                <p className="text-xs text-muted-foreground">۱ ساعت پیش</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">مریم احمدی مأموریت را تأیید کرد</p>
                <p className="text-xs text-muted-foreground">۲ ساعت پیش</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      </MainLayout>
    </ProtectedRoute>
  );
}