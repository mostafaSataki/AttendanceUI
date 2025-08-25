'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Clock, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Import types and API functions
import { 
  requestsAPI, 
  RequestType, 
  LeaveType, 
  MissionType,
  CreateLeaveRequestData,
  CreateMissionRequestData
} from '@/lib/requests';
import { useAuthStore } from '@/store/auth';

// Form validation schemas
const leaveRequestSchema = z.object({
  leave_type_id: z.number().min(1, 'نوع مرخصی الزامی است'),
  start_date: z.string().min(1, 'تاریخ شروع الزامی است'),
  end_date: z.string().min(1, 'تاریخ پایان الزامی است'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_hourly: z.boolean(),
  description: z.string().optional(),
  document: z.any().optional()
}).refine(data => {
  if (data.is_hourly) {
    return data.start_time && data.end_time;
  }
  return true;
}, {
  message: 'برای درخواست ساعتی، زمان شروع و پایان الزامی است',
  path: ['is_hourly']
});

const missionRequestSchema = z.object({
  mission_type_id: z.number().min(1, 'نوع مأموریت الزامی است'),
  start_date: z.string().min(1, 'تاریخ شروع الزامی است'),
  end_date: z.string().min(1, 'تاریخ پایان الزامی است'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  is_hourly: z.boolean(),
  description: z.string().optional(),
  destination: z.string().optional(),
  estimated_cost: z.number().min(0).optional(),
  document: z.any().optional()
}).refine(data => {
  if (data.is_hourly) {
    return data.start_time && data.end_time;
  }
  return true;
}, {
  message: 'برای درخواست ساعتی، زمان شروع و پایان الزامی است',
  path: ['is_hourly']
});

type LeaveFormData = z.infer<typeof leaveRequestSchema>;
type MissionFormData = z.infer<typeof missionRequestSchema>;

interface NewRequestDialogProps {
  open: boolean;
  onClose: () => void;
  onRequestCreated: () => void;
}

export function NewRequestDialog({ 
  open, 
  onClose, 
  onRequestCreated 
}: NewRequestDialogProps) {
  const { user } = useAuthStore();
  
  // State for request type
  const [requestType, setRequestType] = useState<RequestType>('LEAVE');
  
  // State for form data
  const [isHourly, setIsHourly] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  
  // State for API data
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [missionTypes, setMissionTypes] = useState<MissionType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // State for date pickers
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  // Form hooks
  const leaveForm = useForm<LeaveFormData>({
    resolver: zodResolver(leaveRequestSchema),
    defaultValues: {
      is_hourly: false,
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: ''
    }
  });

  const missionForm = useForm<MissionFormData>({
    resolver: zodResolver(missionRequestSchema),
    defaultValues: {
      is_hourly: false,
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      estimated_cost: 0
    }
  });

  // Load types when dialog opens
  useEffect(() => {
    if (open) {
      loadTypes();
    }
  }, [open]);

  // Load leave and mission types
  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const [leaveResponse, missionResponse] = await Promise.all([
        requestsAPI.getLeaveTypes(),
        requestsAPI.getMissionTypes()
      ]);
      
      setLeaveTypes(leaveResponse.data);
      setMissionTypes(missionResponse.data);
    } catch (error) {
      toast.error('خطا در بارگیری انواع درخواست‌ها');
    } finally {
      setLoadingTypes(false);
    }
  };

  // Handle request type change
  const handleRequestTypeChange = (type: RequestType) => {
    setRequestType(type);
    setIsHourly(false);
    setSelectedDocument(null);
    setStartDate(undefined);
    setEndDate(undefined);
    
    // Reset forms
    leaveForm.reset();
    missionForm.reset();
  };

  // Handle hourly switch change
  const handleHourlyChange = (checked: boolean) => {
    setIsHourly(checked);
    
    // Update both forms
    leaveForm.setValue('is_hourly', checked);
    missionForm.setValue('is_hourly', checked);
    
    // Clear time fields when switching to daily
    if (!checked) {
      leaveForm.setValue('start_time', '');
      leaveForm.setValue('end_time', '');
      missionForm.setValue('start_time', '');
      missionForm.setValue('end_time', '');
    }
  };

  // Handle date change
  const handleDateChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
      const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
      leaveForm.setValue('start_date', dateStr);
      missionForm.setValue('start_date', dateStr);
    } else {
      setEndDate(date);
      const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
      leaveForm.setValue('end_date', dateStr);
      missionForm.setValue('end_date', dateStr);
    }
  };

  // Handle document selection
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedDocument(file);
      leaveForm.setValue('document', file);
      missionForm.setValue('document', file);
    }
  };

  // Handle document removal
  const handleDocumentRemove = () => {
    setSelectedDocument(null);
    leaveForm.setValue('document', undefined);
    missionForm.setValue('document', undefined);
  };

  // Form submission
  const onSubmit = async (data: LeaveFormData | MissionFormData) => {
    if (!user) {
      toast.error('کاربر وارد نشده است');
      return;
    }

    setSubmitting(true);
    try {
      let result;
      
      if (requestType === 'LEAVE') {
        const leaveData: CreateLeaveRequestData = {
          personnel_id: user.id.toString(),
          leave_type_id: (data as LeaveFormData).leave_type_id,
          start_date: (data as LeaveFormData).start_date,
          end_date: (data as LeaveFormData).end_date,
          start_time: (data as LeaveFormData).start_time,
          end_time: (data as LeaveFormData).end_time,
          is_hourly: (data as LeaveFormData).is_hourly,
          description: (data as LeaveFormData).description,
          document: (data as LeaveFormData).document
        };
        
        result = await requestsAPI.createLeaveRequest(leaveData);
      } else {
        const missionData: CreateMissionRequestData = {
          personnel_id: user.id.toString(),
          mission_type_id: (data as MissionFormData).mission_type_id,
          start_date: (data as MissionFormData).start_date,
          end_date: (data as MissionFormData).end_date,
          start_time: (data as MissionFormData).start_time,
          end_time: (data as MissionFormData).end_time,
          is_hourly: (data as MissionFormData).is_hourly,
          description: (data as MissionFormData).description,
          destination: (data as MissionFormData).destination,
          estimated_cost: (data as MissionFormData).estimated_cost,
          document: (data as MissionFormData).document
        };
        
        result = await requestsAPI.createMissionRequest(missionData);
      }

      toast.success('درخواست با موفقیت ثبت شد');
      onRequestCreated();
      onClose();
    } catch (error) {
      toast.error('خطا در ثبت درخواست');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when dialog closes
  const handleClose = () => {
    leaveForm.reset();
    missionForm.reset();
    setRequestType('LEAVE');
    setIsHourly(false);
    setSelectedDocument(null);
    setStartDate(undefined);
    setEndDate(undefined);
    onClose();
  };

  const currentForm = requestType === 'LEAVE' ? leaveForm : missionForm;
  const currentTypes = requestType === 'LEAVE' ? leaveTypes : missionTypes;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {requestType === 'LEAVE' ? (
              <FileText className="mr-2 h-5 w-5 text-blue-500" />
            ) : (
              <MapPin className="mr-2 h-5 w-5 text-green-500" />
            )}
            ثبت درخواست جدید
          </DialogTitle>
          <DialogDescription>
            اطلاعات درخواست {requestType === 'LEAVE' ? 'مرخصی' : 'مأموریت'} را وارد کنید
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={currentForm.handleSubmit(onSubmit)} className="space-y-6">
          {/* Request Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">نوع درخواست</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={requestType === 'LEAVE' ? 'default' : 'outline'}
                  onClick={() => handleRequestTypeChange('LEAVE')}
                  className="flex items-center justify-center"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  مرخصی
                </Button>
                <Button
                  type="button"
                  variant={requestType === 'MISSION' ? 'default' : 'outline'}
                  onClick={() => handleRequestTypeChange('MISSION')}
                  className="flex items-center justify-center"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  مأموریت
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">جزئیات درخواست</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>
                  {requestType === 'LEAVE' ? 'نوع مرخصی' : 'نوع مأموریت'}
                </Label>
                {loadingTypes ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <Select
                    onValueChange={(value) => {
                      if (requestType === 'LEAVE') {
                        leaveForm.setValue('leave_type_id', parseInt(value));
                      } else {
                        missionForm.setValue('mission_type_id', parseInt(value));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`انتخاب ${requestType === 'LEAVE' ? 'نوع مرخصی' : 'نوع مأموریت'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Hourly/Daily Switch */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="hourly"
                  checked={isHourly}
                  onCheckedChange={handleHourlyChange}
                />
                <Label htmlFor="hourly" className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  درخواست ساعتی
                </Label>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>تاریخ شروع</Label>
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

                <div className="space-y-2">
                  <Label>تاریخ پایان</Label>
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
              </div>

              {/* Time Selection (for hourly requests) */}
              {isHourly && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>زمان شروع</Label>
                    <Input
                      type="time"
                      {...(requestType === 'LEAVE' 
                        ? leaveForm.register('start_time')
                        : missionForm.register('start_time')
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>زمان پایان</Label>
                    <Input
                      type="time"
                      {...(requestType === 'LEAVE' 
                        ? leaveForm.register('end_time')
                        : missionForm.register('end_time')
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label>توضیحات</Label>
                <Textarea
                  placeholder="توضیحات اختیاری..."
                  {...(requestType === 'LEAVE' 
                    ? leaveForm.register('description')
                    : missionForm.register('description')
                  )}
                />
              </div>

              {/* Mission-specific fields */}
              {requestType === 'MISSION' && (
                <>
                  <div className="space-y-2">
                    <Label>مقصد</Label>
                    <Input
                      placeholder="مقصد مأموریت..."
                      {...missionForm.register('destination')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>هزینه تخمینی (تومان)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      {...missionForm.register('estimated_cost', { valueAsNumber: true })}
                    />
                  </div>
                </>
              )}

              {/* Document Upload */}
              <div className="space-y-2">
                <Label>پیوست (اختیاری)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  {selectedDocument ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedDocument.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(selectedDocument.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDocumentRemove}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">
                        فایل را اینجا بکشید یا برای انتخاب کلیک کنید
                      </p>
                      <Input
                        type="file"
                        onChange={handleDocumentChange}
                        className="hidden"
                        id="document-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('document-upload')?.click()}
                      >
                        انتخاب فایل
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              انصراف
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'در حال ثبت...' : 'ثبت درخواست'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}