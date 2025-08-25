'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authHelpers } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Clock, 
  Calendar, 
  FileText, 
  Plane,
  Menu,
  LogOut,
  Settings,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navigation: NavItem[] = [
  {
    name: 'داشبورد',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    name: 'سازمان‌ها',
    href: '/organization',
    icon: <Building2 className="h-4 w-4" />,
    roles: ['admin', 'manager'],
  },
  {
    name: 'پرسنل',
    href: '/personnel',
    icon: <Users className="h-4 w-4" />,
    roles: ['admin', 'manager'],
  },
  {
    name: 'شیفت‌ها',
    href: '/shifts',
    icon: <Clock className="h-4 w-4" />,
    roles: ['admin', 'manager'],
  },
  {
    name: 'حضور و غیاب',
    href: '/attendance',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    name: 'درخواست‌های مرخصی',
    href: '/leave-requests',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    name: 'درخواست‌های مأموریت',
    href: '/mission-requests',
    icon: <Plane className="h-4 w-4" />,
  },
  {
    name: 'تنظیمات',
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['admin'],
  },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = authHelpers.getCurrentUser();

  const handleLogout = () => {
    authHelpers.logout();
    // Remove token cookie
    document.cookie = 'access_token=; path=/; max-age=0; secure; samesite=strict';
    toast.success('خروج از سیستم با موفقیت انجام شد');
    router.push('/login');
  };

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold">سیستم حضور و غیاب</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
            onClick={() => setSidebarOpen(false)}
          >
            {item.icon}
            <span className="mr-3">{item.name}</span>
          </Link>
        ))}
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {user?.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <Badge variant="secondary" className="text-xs">
                {user?.role === 'admin' ? 'ادمین' : 
                 user?.role === 'manager' ? 'مدیر' : 'کاربر'}
              </Badge>
            </div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          خروج از سیستم
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 flex flex-col border-r bg-white">
          <NavContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <div className="hidden lg:block">
                <h2 className="text-lg font-medium text-gray-900">
                  {navigation.find(item => item.href === pathname)?.name || 'داشبورد'}
                </h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="lg:hidden">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {user?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}