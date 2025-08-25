'use client';

import { useState, useEffect } from 'react';
import { WorkGroup, WorkGroupResponse, WorkGroupFilters, Shift, WorkGroupShiftAssignment } from '@/lib/scheduling';
import { workGroupService, shiftService, calendarService } from '@/lib/scheduling';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Users,
  Calendar,
  Clock,
  Repeat
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form validation schema for work group
const workGroupSchema = z.object({
  name: z.string().min(1, 'نام گروه کاری الزامی است'),
  description: z.string().optional(),
  repeat_period: z.number().min(1, 'دوره تکرار باید عددی مثبت باشد'),
  calendar_id: z.number().min(1, 'تقویم کاری الزامی است'),
  is_active: z.boolean(),
});

type WorkGroupFormData = z.infer<typeof workGroupSchema>;

interface WorkGroupAssignmentForm {
  day_index: number;
  shift_id: number;
}

export default function WorkGroupsPage() {
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<WorkGroupFilters>({
    skip: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedWorkGroup, setSelectedWorkGroup] = useState<WorkGroup | null>(null);
  const [editingWorkGroup, setEditingWorkGroup] = useState<WorkGroup | null>(null);
  const [assignments, setAssignments] = useState<WorkGroupAssignmentForm[]>([]);

  const form = useForm<WorkGroupFormData>({
    resolver: zodResolver(workGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      repeat_period: 7,
      calendar_id: 0,
      is_active: true,
    },
  });

  // Load work groups data
  const loadWorkGroups = async () => {
    try {
      setLoading(true);
      const response = await workGroupService.getWorkGroups(filters);
      setWorkGroups(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('خطا در بارگذاری لیست گروه‌های کاری');
    } finally {
      setLoading(false);
    }
  };

  // Load shifts and calendars
  const loadReferenceData = async () => {
    try {
      const [shiftsResponse, calendarsResponse] = await Promise.all([
        shiftService.getActiveShifts(),
        calendarService.getActiveCalendars(),
      ]);
      setShifts(shiftsResponse);
      setCalendars(calendarsResponse);
    } catch (error) {
      toast.error('خطا در بارگذاری داده‌های مرجع');
    }
  };

  useEffect(() => {
    loadWorkGroups();
    loadReferenceData();
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

  // Initialize assignments based on repeat period
  const initializeAssignments = (repeatPeriod: number, existingAssignments?: WorkGroupShiftAssignment[]) => {
    const newAssignments: WorkGroupAssignmentForm[] = [];
    
    for (let i = 0; i < repeatPeriod; i++) {
      const existingAssignment = existingAssignments?.find(a => a.day_index === i);
      newAssignments.push({
        day_index: i,
        shift_id: existingAssignment?.shift_id || 0,
      });
    }
    
    setAssignments(newAssignments);
  };

  // Handle repeat period change
  const handleRepeatPeriodChange = (repeatPeriod: number) => {
    form.setValue('repeat_period', repeatPeriod);
    initializeAssignments(repeatPeriod);
  };

  // Handle assignment change
  const handleAssignmentChange = (dayIndex: number, shiftId: number) => {
    setAssignments(prev => 
      prev.map(assignment => 
        assignment.day_index === dayIndex 
          ? { ...assignment, shift_id: shiftId }
          : assignment
      )
    );
  };

  // Handle form submission
  const onSubmit = async (data: WorkGroupFormData) => {
    try {
      const validationErrors = workGroupService.validateWorkGroupData(data);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => toast.error(error));
        return;
      }

      const assignmentValidationErrors = workGroupService.validateWorkGroupAssignments(
        assignments, 
        data.repeat_period
      );
      if (assignmentValidationErrors.length > 0) {
        assignmentValidationErrors.forEach(error => toast.error(error));
        return;
      }

      const workGroupData = {
        ...data,
        assignments: assignments.filter(a => a.shift_id > 0),
      };

      if (editingWorkGroup) {
        await workGroupService.updateWorkGroup(editingWorkGroup.id, workGroupData);
        toast.success('گروه کاری با موفقیت به‌روزرسانی شد');
      } else {
        await workGroupService.createWorkGroup(workGroupData);
        toast.success('گروه کاری جدید با موفقیت اضافه شد');
      }
      
      setIsDialogOpen(false);
      setEditingWorkGroup(null);
      form.reset();
      setAssignments([]);
      loadWorkGroups();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره اطلاعات گروه کاری');
    }
  };

  // Handle edit
  const handleEdit = (workGroup: WorkGroup) => {
    setEditingWorkGroup(workGroup);
    form.reset({
      name: workGroup.name,
      description: workGroup.description || '',
      repeat_period: workGroup.repeat_period,
      calendar_id: workGroup.calendar_id,
      is_active: workGroup.is_active,
    });
    
    // Initialize assignments from existing data
    if (workGroup.assignments) {
      initializeAssignments(workGroup.repeat_period, workGroup.assignments);
    } else {
      initializeAssignments(workGroup.repeat_period);
    }
    
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (workGroup: WorkGroup) => {
    setSelectedWorkGroup(workGroup);
    setIsAlertDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (selectedWorkGroup) {
      try {
        await workGroupService.deleteWorkGroup(selectedWorkGroup.id);
        toast.success('گروه کاری با موفقیت حذف شد');
        loadWorkGroups();
      } catch (error) {
        toast.error('خطا در حذف گروه کاری');
      } finally {
        setIsAlertDialogOpen(false);
        setSelectedWorkGroup(null);
      }
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingWorkGroup(null);
    form.reset();
    setAssignments([]);
  };

  const totalPages = Math.ceil(total / filters.limit!);
  const currentPage = Math.floor(filters.skip! / filters.limit!) + 1;

  const getDayName = (dayIndex: number) => {
    const days = ['روز اول', 'روز دوم', 'روز سوم', 'روز چهارم', 'روز پنجم', 'روز ششم', 'روز هفتم', 'روز هشتم', 'روز نهم', 'روز دهم'];
    return days[dayIndex] || `روز ${dayIndex + 1}`;
  };

  const getShiftName = (shiftId: number) => {
    const shift = shifts.find(s => s.id === shiftId);
    return shift?.name || 'انتخاب نشده';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت گروه‌های کاری</h1>
          <p className="text-muted-foreground">
            تعریف چرخه‌های کاری و تخصیص شیفت‌ها به روزهای کاری
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              افزودن گروه کاری
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingWorkGroup ? 'ویرایش گروه کاری' : 'افزودن گروه کاری جدید'}
              </DialogTitle>
              <DialogDescription>
                {editingWorkGroup 
                  ? 'اطلاعات گروه کاری را ویرایش کنید'
                  : 'اطلاعات گروه کاری جدید را وارد کنید'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6 py-4">
                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">نام گروه کاری</Label>
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
                  
                  <div>
                    <Label htmlFor="repeat_period">دوره تکرار</Label>
                    <Select 
                      onValueChange={(value) => handleRepeatPeriodChange(parseInt(value))}
                      defaultValue={form.getValues('repeat_period')?.toString()}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="دوره تکرار را انتخاب کنید" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">روزانه</SelectItem>
                        <SelectItem value="7">هفتگی</SelectItem>
                        <SelectItem value="14">دو هفته‌ای</SelectItem>
                        <SelectItem value="30">ماهانه</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.repeat_period && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.repeat_period.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">توضیحات</Label>
                  <Input
                    id="description"
                    {...form.register('description')}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="calendar_id">تقویم کاری</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('calendar_id', parseInt(value))}
                    defaultValue={form.getValues('calendar_id')?.toString()}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="تقویم کاری را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar.id} value={calendar.id.toString()}>
                          {calendar.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.calendar_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.calendar_id.message}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...form.register('is_active')}
                    checked={form.watch('is_active')}
                    onChange={(e) => {
                      form.setValue('is_active', e.target.checked);
                    }}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">فعال</Label>
                </div>

                {/* Shift Assignments */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">تخصیص شیفت‌ها</h3>
                  <div className="grid gap-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.day_index} className="flex items-center space-x-4">
                        <Label className="w-24 text-sm">{getDayName(assignment.day_index)}</Label>
                        <Select 
                          value={assignment.shift_id?.toString() || ''}
                          onValueChange={(value) => handleAssignmentChange(assignment.day_index, parseInt(value))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="شیفت را انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">بدون شیفت</SelectItem>
                            {shifts.map((shift) => (
                              <SelectItem key={shift.id} value={shift.id.toString()}>
                                {shift.name} ({shift.start_time} - {shift.end_time})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  انصراف
                </Button>
                <Button type="submit">
                  {editingWorkGroup ? 'به‌روزرسانی' : 'ذخیره'}
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
              placeholder="جستجوی گروه کاری..."
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

      {/* Work Groups Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام گروه کاری</TableHead>
              <TableHead>دوره تکرار</TableHead>
              <TableHead>تقویم کاری</TableHead>
              <TableHead>تعداد شیفت‌ها</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="mr-2">در حال بارگذاری...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : workGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">هیچ گروه کاری یافت نشد</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              workGroups.map((workGroup) => (
                <TableRow key={workGroup.id}>
                  <TableCell className="font-medium">{workGroup.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Repeat className="h-4 w-4 mr-1 text-blue-600" />
                      <span>
                        {workGroup.repeat_period === 1 ? 'روزانه' :
                         workGroup.repeat_period === 7 ? 'هفتگی' :
                         workGroup.repeat_period === 14 ? 'دو هفته‌ای' :
                         workGroup.repeat_period === 30 ? 'ماهانه' :
                         `${workGroup.repeat_period} روزه`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-green-600" />
                      <span>{workGroup.calendar_name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-orange-600" />
                      <span>{workGroup.assignments?.length || 0} شیفت</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={workGroup.is_active ? "default" : "secondary"}>
                      {workGroup.is_active ? "فعال" : "غیرفعال"}
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
                        <DropdownMenuItem onClick={() => handleEdit(workGroup)}>
                          <Edit className="mr-2 h-4 w-4" />
                          ویرایش
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(workGroup)}>
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
            <AlertDialogTitle>تأیید حذف گروه کاری</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف گروه کاری "{selectedWorkGroup?.name}" اطمینان دارید؟
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