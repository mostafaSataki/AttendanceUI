'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, RefreshCw, Eye, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import our attendance API and types
import { 
  attendanceAPI, 
  attendanceUtils, 
  DailySummary, 
  AttendanceFilters,
  ProcessAttendanceData 
} from '@/lib/attendance';
import { personnelService, Personnel } from '@/lib/personnel';
import { shiftService, Shift } from '@/lib/scheduling';

// Import the correction dialog component (we'll create this next)
import { DailyCorrectionDialog } from '@/components/attendance/DailyCorrectionDialog';

export default function AttendancePage() {
  const router = useRouter();
  
  // State for filters
  const [filters, setFilters] = useState<AttendanceFilters>({
    personnel_ids: [],
    start_date: '',
    end_date: '',
    shift_id: '',
    status: ''
  });
  
  // State for data
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<DailySummary | null>(null);
  
  // State for date pickers
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Load initial data
  useEffect(() => {
    loadPersonnel();
    loadShifts();
  }, []);

  // Load personnel data
  const loadPersonnel = async () => {
    try {
      const response = await personnelService.getPersonnel({ limit: 1000 });
      setPersonnel(response.data);
    } catch (error) {
      toast.error('خطا در بارگیری لیست پرسنل');
    }
  };

  // Load shifts data
  const loadShifts = async () => {
    try {
      const response = await shiftService.getActiveShifts();
      setShifts(response);
    } catch (error) {
      toast.error('خطا در بارگیری لیست شیفت‌ها');
    }
  };

  // Handle filter changes
  const handlePersonnelChange = (personnelId: string, isSelected: boolean) => {
    setSelectedPersonnel(prev => {
      const newSelection = isSelected 
        ? [...prev, personnelId]
        : prev.filter(id => id !== personnelId);
      
      setFilters(prev => ({
        ...prev,
        personnel_ids: newSelection.length > 0 ? newSelection : undefined
      }));
      
      return newSelection;
    });
  };

  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      setFilters(prev => ({
        ...prev,
        start_date: date ? format(date, 'yyyy-MM-dd') : ''
      }));
    } else {
      setEndDate(date);
      setFilters(prev => ({
        ...prev,
        end_date: date ? format(date, 'yyyy-MM-dd') : ''
      }));
    }
  };

  // Load attendance data
  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const data = await attendanceAPI.getDailySummaries(filters);
      setSummaries(data);
      
      if (data.length === 0) {
        toast.info('هیچ داده‌ای برای این فیلترها یافت نشد');
      }
    } catch (error) {
      toast.error('خطا در بارگیری داده‌های حضور و غیاب');
    } finally {
      setLoading(false);
    }
  };

  // Process attendance data
  const processAttendanceData = async () => {
    if (!filters.start_date || !filters.end_date) {
      toast.error('لطفاً بازه زمانی را انتخاب کنید');
      return;
    }

    setProcessing(true);
    try {
      const processData: ProcessAttendanceData = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        personnel_ids: filters.personnel_ids,
        shift_id: filters.shift_id ? parseInt(filters.shift_id) : undefined
      };

      const result = await attendanceAPI.processAttendanceData(processData);
      toast.success(`پردازش با موفقیت انجام شد. ${result.processed_count} رکورد پردازش شد.`);
      
      // Refresh data after processing
      await loadAttendanceData();
    } catch (error) {
      toast.error('خطا در پردازش داده‌های حضور و غیاب');
    } finally {
      setProcessing(false);
    }
  };

  // Open correction dialog
  const openCorrectionDialog = (summary: DailySummary) => {
    setSelectedSummary(summary);
    setShowCorrectionDialog(true);
  };

  // Handle correction dialog close
  const handleCorrectionDialogClose = (refreshNeeded: boolean) => {
    setShowCorrectionDialog(false);
    setSelectedSummary(null);
    
    if (refreshNeeded) {
      loadAttendanceData();
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">گزارش روزانه حضور و غیاب</h1>
              <p className="text-muted-foreground">
                مشاهده و مدیریت کارکرد روزانه پرسنل
              </p>
            </div>
          </div>

          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle>فیلترها</CardTitle>
              <CardDescription>
                پرسنل و بازه زمانی مورد نظر را برای مشاهده گزارش انتخاب کنید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Personnel Selection */}
                <div className="space-y-2">
                  <Label>پرسنل</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب پرسنل" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {personnel.map((person) => (
                        <div key={person.id} className="flex items-center p-2">
                          <input
                            type="checkbox"
                            id={`person-${person.id}`}
                            checked={selectedPersonnel.includes(person.id.toString())}
                            onChange={(e) => handlePersonnelChange(person.id.toString(), e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor={`person-${person.id}`} className="text-sm">
                            {person.full_name}
                          </label>
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPersonnel.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedPersonnel.length} پرسنل انتخاب شده
                    </div>
                  )}
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label>از تاریخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "yyyy/MM/dd") : "تاریخ را انتخاب کنید"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => handleDateChange('start', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label>تا تاریخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "yyyy/MM/dd") : "تاریخ را انتخاب کنید"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => handleDateChange('end', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Shift Selection */}
                <div className="space-y-2">
                  <Label>شیفت</Label>
                  <Select 
                    value={filters.shift_id || ''} 
                    onValueChange={(value) => setFilters(prev => ({ ...prev, shift_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="همه شیفت‌ها" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">همه شیفت‌ها</SelectItem>
                      {shifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id.toString()}>
                          {shift.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-4">
                <Label>وضعیت:</Label>
                <div className="flex space-x-2">
                  {['COMPLETE', 'ABSENT', 'INCOMPLETE', 'LEAVE'].map((status) => (
                    <Button
                      key={status}
                      variant={filters.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilters(prev => ({ 
                        ...prev, 
                        status: prev.status === status ? '' : status 
                      }))}
                    >
                      {attendanceUtils.getStatusText(status)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button 
                  onClick={loadAttendanceData} 
                  disabled={loading}
                  className="flex items-center"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  نمایش گزارش
                </Button>
                
                <Button 
                  onClick={processAttendanceData} 
                  disabled={processing || !filters.start_date || !filters.end_date}
                  variant="outline"
                  className="flex items-center"
                >
                  {processing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  پردازش اطلاعات
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {summaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>نتایج گزارش</CardTitle>
                <CardDescription>
                  {summaries.length} رکورد یافت شد
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>پرسنل</TableHead>
                        <TableHead>تاریخ</TableHead>
                        <TableHead>شیفت</TableHead>
                        <TableHead>مجموع حضور</TableHead>
                        <TableHead>تأخیر</TableHead>
                        <TableHead>اضافه‌کار</TableHead>
                        <TableHead>وضعیت</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaries.map((summary) => (
                        <TableRow key={summary.id}>
                          <TableCell className="font-medium">
                            {summary.personnel_name}
                          </TableCell>
                          <TableCell>
                            {attendanceUtils.formatDate(summary.date)}
                          </TableCell>
                          <TableCell>{summary.shift_name || '-'}</TableCell>
                          <TableCell>{summary.total_presence}</TableCell>
                          <TableCell>{summary.total_delay}</TableCell>
                          <TableCell>{summary.total_overtime}</TableCell>
                          <TableCell>
                            <Badge className={attendanceUtils.getStatusColor(summary.status)}>
                              {attendanceUtils.getStatusText(summary.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCorrectionDialog(summary)}
                              className="flex items-center"
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              جزئیات
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && summaries.length === 0 && filters.start_date && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">هیچ داده‌ای یافت نشد</h3>
                <p className="text-muted-foreground text-center mb-4">
                  برای بازه زمانی و فیلترهای انتخاب شده، هیچ داده‌ای وجود ندارد.
                  لطفاً فیلترها را تغییر دهید یا روی دکمه "پردازش اطلاعات" کلیک کنید.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Daily Correction Dialog */}
        {selectedSummary && (
          <DailyCorrectionDialog
            summary={selectedSummary}
            open={showCorrectionDialog}
            onClose={handleCorrectionDialogClose}
          />
        )}
      </MainLayout>
    </ProtectedRoute>
  );
}