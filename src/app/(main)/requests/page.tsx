'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter,
  Loader2,
  Clock,
  MapPin,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Import our requests API and types
import { 
  requestsAPI, 
  requestsUtils, 
  Request, 
  RequestFilters, 
  RequestType,
  RequestStatus 
} from '@/lib/requests';
import { useAuthStore } from '@/store/auth';

// Import the request form dialog (we'll create this next)
import { NewRequestDialog } from '@/components/requests/NewRequestDialog';
import { RequestActionsDropdown } from '@/components/requests/RequestActionsDropdown';

export default function RequestsPage() {
  const { user } = useAuthStore();
  
  // State for data
  const [leaveRequests, setLeaveRequests] = useState<Request[]>([]);
  const [missionRequests, setMissionRequests] = useState<Request[]>([]);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<RequestType>('LEAVE');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  
  // State for filters
  const [filters, setFilters] = useState<RequestFilters>({
    status: undefined,
    search: '',
    start_date: '',
    end_date: ''
  });

  // Load requests data
  useEffect(() => {
    loadRequests();
  }, [activeTab, filters]);

  // Load requests based on active tab and filters
  const loadRequests = async () => {
    setLoading(true);
    try {
      const requestFilters: RequestFilters = {
        ...filters,
        request_type: activeTab
      };

      let response;
      if (activeTab === 'LEAVE') {
        response = await requestsAPI.getLeaveRequests(requestFilters);
        setLeaveRequests(response.data);
      } else {
        response = await requestsAPI.getMissionRequests(requestFilters);
        setMissionRequests(response.data);
      }
    } catch (error) {
      toast.error('خطا در بارگیری درخواست‌ها');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof RequestFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle request status update
  const handleRequestStatusUpdate = async (requestId: string, status: RequestStatus, rejectReason?: string) => {
    try {
      let updatedRequest;
      
      if (activeTab === 'LEAVE') {
        updatedRequest = await requestsAPI.updateLeaveRequestStatus(requestId, {
          status,
          reject_reason: rejectReason
        });
      } else {
        updatedRequest = await requestsAPI.updateMissionRequestStatus(requestId, {
          status,
          reject_reason: rejectReason
        });
      }

      // Update the local state
      if (activeTab === 'LEAVE') {
        setLeaveRequests(prev => 
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
      } else {
        setMissionRequests(prev => 
          prev.map(req => req.id === requestId ? updatedRequest : req)
        );
      }

      toast.success(`وضعیت درخواست با موفقیت ${requestsUtils.getStatusText(status)} شد`);
    } catch (error) {
      toast.error('خطا در به‌روزرسانی وضعیت درخواست');
    }
  };

  // Handle new request creation
  const handleNewRequestCreated = () => {
    setShowNewRequestDialog(false);
    loadRequests();
  };

  // Get current requests based on active tab
  const getCurrentRequests = () => {
    return activeTab === 'LEAVE' ? leaveRequests : missionRequests;
  };

  // Render request row
  const renderRequestRow = (request: Request) => {
    const isLeave = request.request_type === 'LEAVE';
    const canManage = user && requestsUtils.canManageRequest(user.role, request.status);
    const canCancel = requestsUtils.canCancelRequest(request.status);

    return (
      <TableRow key={request.id}>
        <TableCell className="font-medium">
          {request.personnel_name}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            {isLeave ? (
              <FileText className="h-4 w-4 text-blue-500" />
            ) : (
              <MapPin className="h-4 w-4 text-green-500" />
            )}
            <span>
              {isLeave ? (request as LeaveRequest).leave_type_name : (request as MissionRequest).mission_type_name}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="text-sm">
              {requestsUtils.formatDateRange(request.start_date, request.end_date, request.is_hourly)}
            </div>
            {request.is_hourly && (
              <div className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {requestsUtils.formatTimeRange(request.start_time, request.end_time)}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge className={requestsUtils.getStatusColor(request.status)}>
            {requestsUtils.getStatusText(request.status)}
          </Badge>
        </TableCell>
        <TableCell>
          {request.reject_reason && (
            <div className="text-sm text-red-600 max-w-xs truncate">
              {request.reject_reason}
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <RequestActionsDropdown
              request={request}
              canManage={canManage}
              canCancel={canCancel}
              onStatusUpdate={handleRequestStatusUpdate}
              onRequestUpdate={loadRequests}
            />
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">مدیریت درخواست‌ها</h1>
              <p className="text-muted-foreground">
                ثبت، مشاهده و مدیریت درخواست‌های مرخصی و مأموریت
              </p>
            </div>
            <Button
              onClick={() => setShowNewRequestDialog(true)}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              ثبت درخواست جدید
            </Button>
          </div>

          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-5 w-5" />
                فیلترها
              </CardTitle>
              <CardDescription>
                درخواست‌ها را بر اساس معیارهای مختلف فیلتر کنید
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">جستجو</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="نام پرسنل..."
                      value={filters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">وضعیت</label>
                  <Select 
                    value={filters.status || ''} 
                    onValueChange={(value) => handleFilterChange('status', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="همه وضعیت‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="PENDING">در انتظار</SelectItem>
                      <SelectItem value="APPROVED">تأیید شده</SelectItem>
                      <SelectItem value="REJECTED">رد شده</SelectItem>
                      <SelectItem value="CANCELLED">لغو شده</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">از تاریخ</label>
                  <Input
                    type="date"
                    value={filters.start_date || ''}
                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">تا تاریخ</label>
                  <Input
                    type="date"
                    value={filters.end_date || ''}
                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content with Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>درخواست‌ها</CardTitle>
              <CardDescription>
                لیست درخواست‌های مرخصی و مأموریت
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as RequestType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="LEAVE" className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    درخواست‌های مرخصی
                  </TabsTrigger>
                  <TabsTrigger value="MISSION" className="flex items-center">
                    <MapPin className="mr-2 h-4 w-4" />
                    درخواست‌های مأموریت
                  </TabsTrigger>
                </TabsList>

                {/* Leave Requests Tab */}
                <TabsContent value="LEAVE" className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>در حال بارگیری درخواست‌های مرخصی...</span>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>پرسنل</TableHead>
                            <TableHead>نوع مرخصی</TableHead>
                            <TableHead>بازه زمانی</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>دلیل رد (در صورت وجود)</TableHead>
                            <TableHead>عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leaveRequests.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                هیچ درخواست مرخصی یافت نشد
                              </TableCell>
                            </TableRow>
                          ) : (
                            leaveRequests.map(renderRequestRow)
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Mission Requests Tab */}
                <TabsContent value="MISSION" className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>در حال بارگیری درخواست‌های مأموریت...</span>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>پرسنل</TableHead>
                            <TableHead>نوع مأموریت</TableHead>
                            <TableHead>بازه زمانی</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>دلیل رد (در صورت وجود)</TableHead>
                            <TableHead>عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {missionRequests.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                هیچ درخواست مأموریت یافت نشد
                              </TableCell>
                            </TableRow>
                          ) : (
                            missionRequests.map(renderRequestRow)
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* New Request Dialog */}
          <NewRequestDialog
            open={showNewRequestDialog}
            onClose={() => setShowNewRequestDialog(false)}
            onRequestCreated={handleNewRequestCreated}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}