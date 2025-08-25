'use client';

import { useState, useEffect } from 'react';
import { Shift, ShiftResponse, ShiftFilters } from '@/lib/scheduling';
import { shiftService } from '@/lib/scheduling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form validation schema
const shiftSchema = z.object({
  name: z.string().min(1, 'نام شیفت الزامی است'),
  start_time: z.string().min(1, 'ساعت شروع الزامی است'),
  end_time: z.string().min(1, 'ساعت پایان الزامی است'),
  grace_period: z.number().min(0, 'مدت شناوری باید عددی مثبت باشد').optional(),
  is_night_shift: z.boolean(),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ShiftFilters>({
    skip: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      start_time: '',
      end_time: '',
      grace_period: 15,
      is_night_shift: false,
      description: '',
      is_active: true,
    },
  });

  // Load shifts data
  const loadShifts = async () => {
    try {
      setLoading(true);
      const response = await shiftService.getShifts(filters);
      setShifts(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('خطا در بارگذاری لیست شیفت‌ها');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [filters]);

  // Handle search
  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      skip: 0,
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      skip: (page - 1) * filters.limit!,
    }));
  };

  // Handle form submission
  const onSubmit = async (data: ShiftFormData) => {
    try {
      const validationErrors = shiftService.validateShiftData(data);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      if (editingShift) {
        await shiftService.updateShift(editingShift.id, data);
        toast.success('شیفت با موفقیت به‌روزرسانی شد');
      } else {
        await shiftService.createShift(data);
        toast.success('شیفت جدید با موفقیت اضافه شد');
      }
      
      setIsDialogOpen(false);
      setEditingShift(null);
      form.reset();
      loadShifts();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره اطلاعات شیفت');
    }
  };

  // Handle edit
  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    form.reset({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      grace_period: shift.grace_period || 15,
      is_night_shift: shift.is_night_shift || false,
      description: shift.description || '',
      is_active: shift.is_active,
    });
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (shift: Shift) => {
    setSelectedShift(shift);
    setIsAlertDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (selectedShift) {
      try {
        await shiftService.deleteShift(selectedShift.id);
        toast.success('شیفت با موفقیت حذف شد');
        loadShifts();
      } catch (error) {
        toast.error('خطا در حذف شیفت');
      } finally {
        setIsAlertDialogOpen(false);
        setSelectedShift(null);
      }
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingShift(null);
    form.reset();
  };

  const totalPages = Math.ceil(total / filters.limit!);
  const currentPage = Math.floor(filters.skip! / filters.limit!) + 1;

  const formatTime = (time: string) => {
    return time.substring(0, 5); // Show only HH:MM
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت شیفت‌های کاری</h1>
          <p className="text-muted-foreground">
            تعریف و مدیریت شیفت‌های کاری سازمان
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              افزودن شیفت
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'ویرایش شیفت' : 'افزودن شیفت جدید'}
              </DialogTitle>
              <DialogDescription>
                {editingShift 
                  ? 'اطلاعات شیفت را ویرایش کنید'
                  : 'اطلاعات شیفت جدید را وارد کنید'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="name">نام شیفت</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    className="mt-1"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time">ساعت شروع</Label>
                    <Input
                      id="start_time"
                      type="time"
                      {...form.register('start_time')}
                      className="mt-1"
                    />
                    {form.formState.errors.start_time && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.start_time.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="end_time">ساعت پایان</Label>
                    <Input
                      id="end_time"
                      type="time"
                      {...form.register('end_time')}
                      className="mt-1"
                    />
                    {form.formState.errors.end_time && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.end_time.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="grace_period">مدت شناوری (دقیقه)</Label>
                  <Input
                    id="grace_period"
                    type="number"
                    min="0"
                    {...form.register('grace_period', { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {form.formState.errors.grace_period && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.grace_period.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description">توضیحات</Label>
                  <Input
                    id="description"
                    {...form.register('description')}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_night_shift"
                      {...form.register('is_night_shift')}
                      checked={form.watch('is_night_shift')}
                      onCheckedChange={(checked) => {
                        form.setValue('is_night_shift', checked as boolean);
                      }}
                    />
                    <Label htmlFor="is_night_shift">شیفت شب</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_active"
                      {...form.register('is_active')}
                      checked={form.watch('is_active')}
                      onCheckedChange={(checked) => {
                        form.setValue('is_active', checked as boolean);
                      }}
                    />
                    <Label htmlFor="is_active">فعال</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  انصراف
                </Button>
                <Button type="submit">
                  {editingShift ? 'به‌روزرسانی' : 'ذخیره'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="جستجوی شیفت..."
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

      {/* Shifts Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام شیفت</TableHead>
              <TableHead>ساعت شروع</TableHead>
              <TableHead>ساعت پایان</TableHead>
              <TableHead>شناوری</TableHead>
              <TableHead>نوع</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="mr-2">در حال بارگذاری...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">هیچ شیفتی یافت نشد</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              shifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{formatTime(shift.start_time)}</TableCell>
                  <TableCell>{formatTime(shift.end_time)}</TableCell>
                  <TableCell>{shift.grace_period || 15} دقیقه</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {shift.is_night_shift ? (
                        <>
                          <Moon className="h-4 w-4 mr-1 text-blue-600" />
                          <span>شب</span>
                        </>
                      ) : (
                        <>
                          <Sun className="h-4 w-4 mr-1 text-yellow-600" />
                          <span>روز</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={shift.is_active ? "default" : "secondary"}>
                      {shift.is_active ? "فعال" : "غیرفعال"}
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
                        <DropdownMenuItem onClick={() => handleEdit(shift)}>
                          <Edit className="mr-2 h-4 w-4" />
                          ویرایش
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(shift)}>
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

      {/* Pagination */}
      {total > filters.limit! && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            نمایش {filters.skip! + 1} تا {Math.min(filters.skip! + filters.limit!, total)} از {total} مورد
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              قبلی
            </Button>
            <span className="text-sm">
              صفحه {currentPage} از {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید حذف شیفت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف شیفت "{selectedShift?.name}" اطمینان دارید؟
              این عملیات غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}