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
import { 
  Checkbox,
  CheckboxGroup
} from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Download, 
  Filter, 
  Search, 
  Loader2,
  FileText,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import our reports API and types
import { 
  reportsAPI, 
  reportsUtils, 
  ReportFilters, 
  SummaryReportRow,
  SummaryReportResponse,
  ExportFormat
} from '@/lib/reports';
import { personnelService, Personnel } from '@/lib/personnel';

export default function ReportsPage() {
  const router = useRouter();
  
  // State for filters
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: '',
    end_date: '',
    personnel_ids: [],
    org_unit_ids: [],
    department_ids: [],
    shift_ids: []
  });
  
  // State for data
  const [reportData, setReportData] = useState<SummaryReportRow[]>([]);
  const [reportSummary, setReportSummary] = useState<any>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('CSV');
  
  // State for date pickers
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Load initial data
  useEffect(() => {
    loadPersonnel();
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

  // Handle filter changes
  const handlePersonnelChange = (personnelId: string, checked: boolean) => {
    setSelectedPersonnel(prev => {
      const newSelection = checked 
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

  // Generate report
  const generateReport = async () => {
    // Validate filters
    const errors = reportsUtils.validateFilters(filters);
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    setLoading(true);
    try {
      const response: SummaryReportResponse = await reportsAPI.getSummaryReport(filters);
      setReportData(response.data);
      setReportSummary(response.summary);
      
      if (response.data.length === 0) {
        toast.info('هیچ داده‌ای برای فیلترهای انتخاب شده یافت نشد');
      } else {
        toast.success(`گزارش با موفقیت ایجاد شد. ${response.data.length} رکورد یافت شد.`);
      }
    } catch (error) {
      toast.error('خطا در ایجاد گزارش');
    } finally {
      setLoading(false);
    }
  };

  // Download payroll export
  const downloadPayrollExport = async () => {
    if (!filters.start_date || !filters.end_date) {
      toast.error('لطفاً بازه زمانی را انتخاب کنید');
      return;
    }

    setExporting(true);
    try {
      const blob = await reportsAPI.downloadPayrollExport(filters, {
        format: exportFormat,
        include_headers: true
      });
      
      const filename = reportsUtils.generateExportFilename(
        exportFormat, 
        filters.start_date, 
        filters.end_date
      );
      
      reportsUtils.downloadBlob(blob, filename);
      toast.success(`فایل خروجی با موفقیت دانلود شد: ${filename}`);
    } catch (error) {
      toast.error('خطا در دانلود فایل خروجی');
    } finally {
      setExporting(false);
    }
  };

  // Calculate summary statistics
  const summaryStats = reportData.length > 0 ? reportsUtils.calculateSummaryStats(reportData) : null;

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">گزارش‌گیری مدیریتی</h1>
              <p className="text-muted-foreground">
                گزارش‌های تجمیعی و خروجی حقوق و دستمزد
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'مخفی کردن فیلترها' : 'نمایش فیلترها'}
            </Button>
          </div>

          {/* Filters Card */}
          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="mr-2 h-5 w-5" />
                  فیلترهای گزارش
                </CardTitle>
                <CardDescription>
                  بازه زمانی و پرسنل مورد نظر را برای ایجاد گزارش انتخاب کنید
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  {/* Export Format */}
                  <div className="space-y-2">
                    <Label>فرمت خروجی</Label>
                    <Select 
                      value={exportFormat} 
                      onValueChange={(value) => setExportFormat(value as ExportFormat)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSV">CSV (متن جداشده)</SelectItem>
                        <SelectItem value="EXCEL">Excel (فایل اکسل)</SelectItem>
                        <SelectItem value="PDF">PDF (سند قابل چاپ)</SelectItem>
                        <SelectItem value="TXT">Text (فایل متنی)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Personnel Selection */}
                <div className="space-y-2">
                  <Label>پرسنل</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {personnel.map((person) => (
                      <div key={person.id} className="flex items-center p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          id={`person-${person.id}`}
                          checked={selectedPersonnel.includes(person.id.toString())}
                          onChange={(e) => handlePersonnelChange(person.id.toString(), e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`person-${person.id}`} className="text-sm cursor-pointer flex-1">
                          <span className="font-medium">{person.full_name}</span>
                          <span className="text-muted-foreground mr-2">({person.personnel_number})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedPersonnel.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {selectedPersonnel.length} پرسنل انتخاب شده
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={generateReport} 
                    disabled={loading || !filters.start_date || !filters.end_date}
                    className="flex items-center"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <BarChart3 className="mr-2 h-4 w-4" />
                    )}
                    ایجاد گزارش
                  </Button>
                  
                  <Button 
                    onClick={downloadPayrollExport} 
                    disabled={exporting || !filters.start_date || !filters.end_date}
                    variant="outline"
                    className="flex items-center"
                  >
                    {exporting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    دریافت فایل حقوق و دستمزد
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          {summaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="mr-4">
                      <div className="text-2xl font-bold">{summaryStats.totalPersonnel}</div>
                      <div className="text-sm text-muted-foreground">تعداد پرسنل</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div className="mr-4">
                      <div className="text-2xl font-bold">{summaryStats.presentDays}</div>
                      <div className="text-sm text-muted-foreground">جمع روزهای حضور</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="mr-4">
                      <div className="text-2xl font-bold">{reportsUtils.formatHours(summaryStats.totalOvertime)}</div>
                      <div className="text-sm text-muted-foreground">جمع اضافه‌کار</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="mr-4">
                      <div className="text-2xl font-bold">{reportsUtils.formatPercentage(summaryStats.averageAttendance)}</div>
                      <div className="text-sm text-muted-foreground">میانگین حضور</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Report Data Table */}
          {reportData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    گزارش تجمیعی حضور و غیاب
                  </div>
                  <Badge variant="outline">
                    {reportData.length} رکورد
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {filters.start_date && filters.end_date && (
                    <>بازه زمانی: {reportsUtils.formatDateRange(filters.start_date, filters.end_date)}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>پرسنل</TableHead>
                        <TableHead>شماره پرسنلی</TableHead>
                        <TableHead>واحد سازمانی</TableHead>
                        <TableHead>روزهای کاری</TableHead>
                        <TableHead>حضور</TableHead>
                        <TableHead>غیبت</TableHead>
                        <TableHead>مرخصی</TableHead>
                        <TableHead>مأموریت</TableHead>
                        <TableHead>اضافه‌کار</TableHead>
                        <TableHead>تأخیر</TableHead>
                        <TableHead>درصد حضور</TableHead>
                        <TableHead>وضعیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row) => (
                        <TableRow key={row.personnel_id}>
                          <TableCell className="font-medium">
                            {row.personnel_name}
                          </TableCell>
                          <TableCell>{row.personnel_number}</TableCell>
                          <TableCell>{row.org_unit || '-'}</TableCell>
                          <TableCell>{row.working_days}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {row.present_days}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {row.absent_days}
                          </TableCell>
                          <TableCell className="text-blue-600">
                            {row.leave_days}
                          </TableCell>
                          <TableCell className="text-purple-600">
                            {row.mission_days}
                          </TableCell>
                          <TableCell>
                            {reportsUtils.formatHours(row.total_overtime_hours)}
                          </TableCell>
                          <TableCell>
                            {reportsUtils.formatHours(row.total_delay_hours)}
                          </TableCell>
                          <TableCell>
                            {reportsUtils.formatPercentage(row.attendance_percentage)}
                          </TableCell>
                          <TableCell>
                            <Badge className={reportsUtils.getAttendanceStatusColor(row.attendance_percentage)}>
                              {reportsUtils.getAttendanceStatusText(row.attendance_percentage)}
                            </Badge>
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
          {!loading && reportData.length === 0 && filters.start_date && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">هیچ داده‌ای یافت نشد</h3>
                <p className="text-muted-foreground text-center mb-4">
                  برای بازه زمانی و فیلترهای انتخاب شده، هیچ داده‌ای وجود ندارد.
                  لطفاً فیلترها را تغییر دهید یا روی دکمه "ایجاد گزارش" کلیک کنید.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Initial State */}
          {!filters.start_date && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">گزارش‌گیری مدیریتی</h3>
                <p className="text-muted-foreground text-center mb-4">
                  برای ایجاد گزارش، لطفاً بازه زمانی و پرسنل مورد نظر را از فیلترهای بالا انتخاب کرده و بر روی دکمه "ایجاد گزارش" کلیک کنید.
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  شما می‌توانید گزارش‌های تجمیعی را مشاهده کرده و فایل خروجی حقوق و دستمزد را برای تیم مالی دانلود کنید.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}