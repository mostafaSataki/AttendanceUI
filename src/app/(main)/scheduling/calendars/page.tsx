'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarType, CalendarResponse, Holiday, HolidayFilters } from '@/lib/scheduling';
import { calendarService, holidayService } from '@/lib/scheduling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  MapPin,
  Eye
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';

// Form validation schema for calendar
const calendarSchema = z.object({
  name: z.string().min(1, 'نام تقویم الزامی است'),
  year: z.number().min(1300, 'سال باید عددی معتبر باشد').max(1500, 'سال باید عددی معتبر باشد'),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type CalendarFormData = z.infer<typeof calendarSchema>;

// Form validation schema for holiday
const holidaySchema = z.object({
  name: z.string().min(1, 'نام تعطیلی الزامی است'),
  date: z.string().min(1, 'تاریخ تعطیلی الزامی است'),
  is_recurring: z.boolean(),
  description: z.string().optional(),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export default function CalendarsPage() {
  const router = useRouter();
  const [calendars, setCalendars] = useState<CalendarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<CalendarType | null>(null);
  const [editingCalendar, setEditingCalendar] = useState<CalendarType | null>(null);
  const [selectedHolidayCalendar, setSelectedHolidayCalendar] = useState<CalendarType | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const calendarForm = useForm<CalendarFormData>({
    resolver: zodResolver(calendarSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      description: '',
      is_active: true,
    },
  });

  const holidayForm = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      description: '',
    },
  });

  // Load calendars data
  const loadCalendars = async () => {
    try {
      setLoading(true);
      const response = await calendarService.getCalendars({
        limit: 1000,
      });
      setCalendars(response.data);
    } catch (error) {
      toast.error('خطا در بارگذاری لیست تقویم‌ها');
    } finally {
      setLoading(false);
    }
  };

  // Load holidays for a calendar
  const loadHolidays = async (calendarId: number) => {
    try {
      const response = await holidayService.getHolidaysByCalendar(calendarId);
      setHolidays(response);
    } catch (error) {
      toast.error('خطا در بارگذاری تعطیلات');
    }
  };

  useEffect(() => {
    loadCalendars();
  }, []);

  // Handle search
  const handleSearch = () => {
    // In a real implementation, you would filter the calendars
    // For now, we'll just reload the data
    loadCalendars();
  };

  // Handle calendar form submission
  const onCalendarSubmit = async (data: CalendarFormData) => {
    try {
      const validationErrors = calendarService.validateCalendarData(data);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      if (editingCalendar) {
        await calendarService.updateCalendar(editingCalendar.id, data);
        toast.success('تقویم با موفقیت به‌روزرسانی شد');
      } else {
        await calendarService.createCalendar(data);
        toast.success('تقویم جدید با موفقیت اضافه شد');
      }
      
      setIsCalendarDialogOpen(false);
      setEditingCalendar(null);
      calendarForm.reset();
      loadCalendars();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره اطلاعات تقویم');
    }
  };

  // Handle holiday form submission
  const onHolidaySubmit = async (data: HolidayFormData) => {
    if (!selectedHolidayCalendar) {
      toast.error('لطفاً یک تقویم انتخاب کنید');
      return;
    }

    try {
      const validationErrors = holidayService.validateHolidayData({
        ...data,
        calendar_id: selectedHolidayCalendar.id,
      });
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      await holidayService.createHoliday({
        ...data,
        calendar_id: selectedHolidayCalendar.id,
      });
      
      toast.success('تعطیلی با موفقیت اضافه شد');
      setIsHolidayDialogOpen(false);
      holidayForm.reset();
      setSelectedHolidayCalendar(null);
      
      // Reload holidays if we're viewing the same calendar
      if (selectedCalendar?.id === selectedHolidayCalendar.id) {
        loadHolidays(selectedCalendar.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره اطلاعات تعطیلی');
    }
  };

  // Handle edit calendar
  const handleEditCalendar = (calendar: CalendarType) => {
    setEditingCalendar(calendar);
    calendarForm.reset({
      name: calendar.name,
      year: calendar.year,
      description: calendar.description || '',
      is_active: calendar.is_active,
    });
    setIsCalendarDialogOpen(true);
  };

  // Handle delete calendar
  const handleDeleteCalendar = (calendar: CalendarType) => {
    setSelectedCalendar(calendar);
    setIsAlertDialogOpen(true);
  };

  // Confirm delete calendar
  const confirmDeleteCalendar = async () => {
    if (selectedCalendar) {
      try {
        await calendarService.deleteCalendar(selectedCalendar.id);
        toast.success('تقویم با موفقیت حذف شد');
        loadCalendars();
      } catch (error) {
        toast.error('خطا در حذف تقویم');
      } finally {
        setIsAlertDialogOpen(false);
        setSelectedCalendar(null);
      }
    }
  };

  // Handle view calendar details
  const handleViewCalendar = (calendar: CalendarType) => {
    setSelectedCalendar(calendar);
    loadHolidays(calendar.id);
  };

  // Handle add holiday
  const handleAddHoliday = (calendar: CalendarType) => {
    setSelectedHolidayCalendar(calendar);
    holidayForm.reset({
      name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      description: '',
    });
    setIsHolidayDialogOpen(true);
  };

  // Reset forms when dialogs close
  const handleCalendarDialogClose = () => {
    setIsCalendarDialogOpen(false);
    setEditingCalendar(null);
    calendarForm.reset();
  };

  const handleHolidayDialogClose = () => {
    setIsHolidayDialogOpen(false);
    setSelectedHolidayCalendar(null);
    holidayForm.reset();
  };

  // Check if a date is a holiday
  const isDateHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => holiday.date === dateStr);
  };

  // Get holiday name for a date
  const getHolidayName = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => h.date === dateStr);
    return holiday?.name;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت تقویم‌ها و تعطیلات</h1>
          <p className="text-muted-foreground">
            تعریف تقویم‌های کاری و مدیریت روزهای تعطیل
          </p>
        </div>
        <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              افزودن تقویم
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCalendar ? 'ویرایش تقویم' : 'افزودن تقویم جدید'}
              </DialogTitle>
              <DialogDescription>
                {editingCalendar 
                  ? 'اطلاعات تقویم را ویرایش کنید'
                  : 'اطلاعات تقویم جدید را وارد کنید'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={calendarForm.handleSubmit(onCalendarSubmit)}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">نام تقویم</Label>
                  <Input
                    id="name"
                    {...calendarForm.register('name')}
                    className="mt-1"
                  />
                  {calendarForm.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {calendarForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="year">سال</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1300"
                    max="1500"
                    {...calendarForm.register('year', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {calendarForm.formState.errors.year && (
                    <p className="text-sm text-red-500 mt-1">
                      {calendarForm.formState.errors.year.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description">توضیحات</Label>
                  <Input
                    id="description"
                    {...calendarForm.register('description')}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...calendarForm.register('is_active')}
                    checked={calendarForm.watch('is_active')}
                    onChange={(e) => {
                      calendarForm.setValue('is_active', e.target.checked);
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">فعال</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCalendarDialogClose}>
                  انصراف
                </Button>
                <Button type="submit">
                  {editingCalendar ? 'به‌روزرسانی' : 'ذخیره'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="جستجوی تقویم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
        </div>
        <Button onClick={handleSearch}>
          جستجو
        </Button>
      </div>

      {/* Calendar List and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">تقویم‌های موجود</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام تقویم</TableHead>
                  <TableHead>سال</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="w-[100px]">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="mr-2">در حال بارگذاری...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : calendars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-center">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">هیچ تقویمی یافت نشد</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  calendars.map((calendar) => (
                    <TableRow key={calendar.id}>
                      <TableCell className="font-medium">{calendar.name}</TableCell>
                      <TableCell>{calendar.year}</TableCell>
                      <TableCell>
                        <Badge variant={calendar.is_active ? "default" : "secondary"}>
                          {calendar.is_active ? "فعال" : "غیرفعال"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCalendar(calendar)}>
                              <Eye className="mr-2 h-4 w-4" />
                              مشاهده تعطیلات
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAddHoliday(calendar)}>
                              <Plus className="mr-2 h-4 w-4" />
                              افزودن تعطیلی
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditCalendar(calendar)}>
                              <Edit className="mr-2 h-4 w-4" />
                              ویرایش
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteCalendar(calendar)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Calendar Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {selectedCalendar ? `تعطیلات ${selectedCalendar.name}` : 'انتخاب تقویم'}
            </h2>
            {selectedCalendar && (
              <Button onClick={() => handleAddHoliday(selectedCalendar)}>
                <Plus className="ml-2 h-4 w-4" />
                افزودن تعطیلی
              </Button>
            )}
          </div>
          
          {selectedCalendar ? (
            <div className="space-y-4">
              {/* Calendar View */}
              <div className="border rounded-lg p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={faIR}
                  className="rounded-md border"
                  modifiers={{
                    holiday: (date) => isDateHoliday(date),
                  }}
                  modifiersStyles={{
                    holiday: { backgroundColor: '#fecaca', color: '#991b1b' },
                  }}
                />
                {selectedDate && isDateHoliday(selectedDate) && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-red-800 font-medium">
                        {getHolidayName(selectedDate)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Holidays List */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">تعطیلات ثبت‌شده</h3>
                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p>هیچ تعطیلی برای این تقویم ثبت نشده است</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{holiday.name}</div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(holiday.date), 'yyyy/MM/dd')}
                            {holiday.is_recurring && (
                              <Badge variant="outline" className="ml-2">
                                سالانه
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-8 text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">لطفاً یک تقویم از لیست سمت چپ انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>افزودن تعطیلی جدید</DialogTitle>
            <DialogDescription>
              افزودن تعطیلی به تقویم {selectedHolidayCalendar?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={holidayForm.handleSubmit(onHolidaySubmit)}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="holiday_name">نام تعطیلی</Label>
                <Input
                  id="holiday_name"
                  {...holidayForm.register('name')}
                  className="mt-1"
                />
                {holidayForm.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {holidayForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="holiday_date">تاریخ تعطیلی</Label>
                <Input
                  id="holiday_date"
                  type="date"
                  {...holidayForm.register('date')}
                  className="mt-1"
                />
                {holidayForm.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">
                    {holidayForm.formState.errors.date.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="holiday_description">توضیحات</Label>
                <Input
                  id="holiday_description"
                  {...holidayForm.register('description')}
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  {...holidayForm.register('is_recurring')}
                  checked={holidayForm.watch('is_recurring')}
                  onChange={(e) => {
                    holidayForm.setValue('is_recurring', e.target.checked);
                  }}
                  className="rounded"
                />
                <Label htmlFor="is_recurring">تعطیلی سالانه</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleHolidayDialogClose}>
                انصراف
              </Button>
              <Button type="submit">
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید حذف تقویم</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف تقویم "{selectedCalendar?.name}" اطمینان دارید؟
              این عملیات غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCalendar}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}