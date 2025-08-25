'use client';

import { useState, useEffect } from 'react';
import { Personnel, PersonnelResponse, PersonnelFilters } from '@/lib/personnel';
import { personnelService } from '@/lib/personnel';
import { orgUnitsAPI } from '@/lib/api';
import { workGroupService } from '@/lib/scheduling';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Building2,
  Calendar
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Form validation schema
const personnelSchema = z.object({
  personnel_number: z.string().min(1, 'شماره پرسنلی الزامی است'),
  card_number: z.string().min(1, 'شماره کارت الزامی است'),
  full_name: z.string().min(1, 'نام کامل الزامی است'),
  email: z.string().email('ایمیل معتبر نیست'),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  org_unit_id: z.number().min(1, 'واحد سازمانی الزامی است'),
  shift_id: z.number().optional(),
  work_group_id: z.number().optional(),
  is_active: z.boolean(),
  hire_date: z.string().optional(),
});

type PersonnelFormData = z.infer<typeof personnelSchema>;

interface OrgUnit {
  id: number;
  name: string;
}

interface WorkGroup {
  id: number;
  name: string;
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PersonnelFilters>({
    skip: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([]);
  const [workGroups, setWorkGroups] = useState<WorkGroup[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  const form = useForm<PersonnelFormData>({
    resolver: zodResolver(personnelSchema),
    defaultValues: {
      personnel_number: '',
      card_number: '',
      full_name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      org_unit_id: 0,
      shift_id: undefined,
      work_group_id: undefined,
      is_active: true,
      hire_date: '',
    },
  });

  // Load personnel data
  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const response = await personnelService.getPersonnel(filters);
      setPersonnel(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('خطا در بارگذاری لیست پرسنل');
    } finally {
      setLoading(false);
    }
  };

  // Load organization units and work groups
  const loadReferenceData = async () => {
    try {
      const [orgUnitsResponse, workGroupsResponse] = await Promise.all([
        orgUnitsAPI.getAll({ limit: 100 }),
        workGroupService.getActiveWorkGroups(),
      ]);
      setOrgUnits(orgUnitsResponse.data?.org_units || []);
      setWorkGroups(workGroupsResponse);
    } catch (error) {
      toast.error('خطا در بارگذاری داده‌های مرجع');
    }
  };

  useEffect(() => {
    loadPersonnel();
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

  // Handle form submission
  const onSubmit = async (data: PersonnelFormData) => {
    try {
      if (editingPersonnel) {
        await personnelService.updatePersonnel(editingPersonnel.id, data);
        toast.success('اطلاعات پرسنل با موفقیت به‌روزرسانی شد');
      } else {
        await personnelService.createPersonnel(data);
        toast.success('پرسنل جدید با موفقیت اضافه شد');
      }
      
      setIsDialogOpen(false);
      setEditingPersonnel(null);
      form.reset();
      loadPersonnel();
    } catch (error: any) {
      toast.error(error.message || 'خطا در ذخیره اطلاعات پرسنل');
    }
  };

  // Handle edit
  const handleEdit = (person: Personnel) => {
    setEditingPersonnel(person);
    form.reset({
      personnel_number: person.personnel_number,
      card_number: person.card_number,
      full_name: person.full_name,
      email: person.email,
      phone: person.phone || '',
      position: person.position || '',
      department: person.department || '',
      org_unit_id: person.org_unit_id,
      shift_id: person.shift_id,
      work_group_id: person.work_group_id,
      is_active: person.is_active,
      hire_date: person.hire_date || '',
    });
    setIsDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (person: Personnel) => {
    setSelectedPersonnel(person);
    setIsAlertDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (selectedPersonnel) {
      try {
        await personnelService.deletePersonnel(selectedPersonnel.id);
        toast.success('پرسنل با موفقیت حذف شد');
        loadPersonnel();
      } catch (error) {
        toast.error('خطا در حذف پرسنل');
      } finally {
        setIsAlertDialogOpen(false);
        setSelectedPersonnel(null);
      }
    }
  };

  // Reset form when dialog closes
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPersonnel(null);
    form.reset();
  };

  const totalPages = Math.ceil(total / filters.limit!);
  const currentPage = Math.floor(filters.skip! / filters.limit!) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">مدیریت پرسنل</h1>
          <p className="text-muted-foreground">
            مدیریت کامل اطلاعات پرسنل سازمان
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              افزودن پرسنل
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingPersonnel ? 'ویرایش اطلاعات پرسنل' : 'افزودن پرسنل جدید'}
              </DialogTitle>
              <DialogDescription>
                {editingPersonnel 
                  ? 'اطلاعات پرسنل را ویرایش کنید'
                  : 'اطلاعات پرسنل جدید را وارد کنید'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="personnel_number">شماره پرسنلی</Label>
                    <Input
                      id="personnel_number"
                      {...form.register('personnel_number')}
                      className="mt-1"
                    />
                    {form.formState.errors.personnel_number && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.personnel_number.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="card_number">شماره کارت</Label>
                    <Input
                      id="card_number"
                      {...form.register('card_number')}
                      className="mt-1"
                    />
                    {form.formState.errors.card_number && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.card_number.message}
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="full_name">نام کامل</Label>
                  <Input
                    id="full_name"
                    {...form.register('full_name')}
                    className="mt-1"
                  />
                  {form.formState.errors.full_name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.full_name.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">ایمیل</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    className="mt-1"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">تلفن</Label>
                    <Input
                      id="phone"
                      {...form.register('phone')}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">سمت</Label>
                    <Input
                      id="position"
                      {...form.register('position')}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="department">دپارتمان</Label>
                  <Input
                    id="department"
                    {...form.register('department')}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="org_unit_id">واحد سازمانی</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('org_unit_id', parseInt(value))}
                    defaultValue={form.getValues('org_unit_id')?.toString()}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="واحد سازمانی را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id.toString()}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.org_unit_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.org_unit_id.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="work_group_id">گروه کاری</Label>
                  <Select 
                    onValueChange={(value) => form.setValue('work_group_id', parseInt(value) || undefined)}
                    defaultValue={form.getValues('work_group_id')?.toString()}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="گروه کاری را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">بدون گروه کاری</SelectItem>
                      {workGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id.toString()}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.work_group_id && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.work_group_id.message}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="hire_date">تاریخ استخدام</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    {...form.register('hire_date')}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    {...form.register('is_active')}
                    className="rounded"
                  />
                  <Label htmlFor="is_active">فعال</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  انصراف
                </Button>
                <Button type="submit">
                  {editingPersonnel ? 'به‌روزرسانی' : 'ذخیره'}
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
              placeholder="جستجوی پرسنل..."
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

      {/* Personnel Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>شماره پرسنلی</TableHead>
              <TableHead>نام کامل</TableHead>
              <TableHead>ایمیل</TableHead>
              <TableHead>واحد سازمانی</TableHead>
              <TableHead>گروه کاری</TableHead>
              <TableHead>سمت</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="mr-2">در حال بارگذاری...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : personnel.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <div className="text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">هیچ پرسنلی یافت نشد</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              personnel.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.personnel_number}</TableCell>
                  <TableCell>{person.full_name}</TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.org_unit_name || '-'}</TableCell>
                  <TableCell>{person.work_group_name || '-'}</TableCell>
                  <TableCell>{person.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={person.is_active ? "default" : "secondary"}>
                      {person.is_active ? "فعال" : "غیرفعال"}
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
                        <DropdownMenuItem onClick={() => handleEdit(person)}>
                          <Edit className="mr-2 h-4 w-4" />
                          ویرایش
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(person)}>
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
            <AlertDialogTitle>تأیید حذف پرسنل</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف پرسنل "{selectedPersonnel?.full_name}" اطمینان دارید؟
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