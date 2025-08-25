'use client';

import { useState, useEffect } from 'react';
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
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Clock,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';

// Import types and API functions
import { 
  attendanceAPI, 
  attendanceUtils, 
  DailySummary, 
  AttendanceLog,
  ManualLogData
} from '@/lib/attendance';

interface DailyCorrectionDialogProps {
  summary: DailySummary;
  open: boolean;
  onClose: (refreshNeeded: boolean) => void;
}

export function DailyCorrectionDialog({ 
  summary, 
  open, 
  onClose 
}: DailyCorrectionDialogProps) {
  // State for raw logs
  const [rawLogs, setRawLogs] = useState<AttendanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // State for editing
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // State for forms
  const [newLog, setNewLog] = useState<ManualLogData>({
    personnel_id: summary.personnel_id,
    log_time: '',
    log_type: 'IN',
    device_id: ''
  });
  
  // State for processing
  const [reprocessing, setReprocessing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load raw logs when dialog opens
  useEffect(() => {
    if (open) {
      loadRawLogs();
    }
  }, [open, summary.personnel_id, summary.date]);

  // Load raw attendance logs
  const loadRawLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await attendanceAPI.getRawLogs(summary.personnel_id, summary.date);
      setRawLogs(logs);
    } catch (error) {
      toast.error('خطا در بارگیری ترددهای خام');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Handle adding new log
  const handleAddLog = async () => {
    if (!newLog.log_time) {
      toast.error('لطفاً زمان تردد را وارد کنید');
      return;
    }

    try {
      const log = await attendanceAPI.addManualLog(newLog);
      setRawLogs(prev => [...prev, log]);
      setNewLog({
        personnel_id: summary.personnel_id,
        log_time: '',
        log_type: 'IN',
        device_id: ''
      });
      setShowAddForm(false);
      setHasChanges(true);
      toast.success('تردد جدید با موفقیت اضافه شد');
    } catch (error) {
      toast.error('خطا در افزودن تردد جدید');
    }
  };

  // Handle updating log
  const handleUpdateLog = async () => {
    if (!editingLog) return;

    try {
      const updatedLog = await attendanceAPI.updateLog(editingLog.id, {
        log_time: editingLog.log_time,
        log_type: editingLog.log_type,
        device_id: editingLog.device_id
      });
      
      setRawLogs(prev => prev.map(log => 
        log.id === editingLog.id ? updatedLog : log
      ));
      
      setEditingLog(null);
      setHasChanges(true);
      toast.success('تردد با موفقیت ویرایش شد');
    } catch (error) {
      toast.error('خطا در ویرایش تردد');
    }
  };

  // Handle deleting log
  const handleDeleteLog = async (logId: string) => {
    try {
      await attendanceAPI.deleteLog(logId);
      setRawLogs(prev => prev.filter(log => log.id !== logId));
      setHasChanges(true);
      toast.success('تردد با موفقیت حذف شد');
    } catch (error) {
      toast.error('خطا در حذف تردد');
    }
  };

  // Handle reprocessing day
  const handleReprocessDay = async () => {
    setReprocessing(true);
    try {
      const updatedSummary = await attendanceAPI.reprocessDay(summary.personnel_id, summary.date);
      
      // Update the summary in parent component by closing with refresh flag
      toast.success('پردازش مجدد با موفقیت انجام شد');
      onClose(true);
    } catch (error) {
      toast.error('خطا در پردازش مجدد روز');
    } finally {
      setReprocessing(false);
    }
  };

  // Reset form states
  const resetForms = () => {
    setEditingLog(null);
    setShowAddForm(false);
    setNewLog({
      personnel_id: summary.personnel_id,
      log_time: '',
      log_type: 'IN',
      device_id: ''
    });
    setHasChanges(false);
  };

  // Handle dialog close
  const handleClose = () => {
    if (hasChanges) {
      if (confirm('تغییراتی ذخیره نشده وجود دارد. آیا از بستن پنجره مطمئن هستید؟')) {
        resetForms();
        onClose(false);
      }
    } else {
      resetForms();
      onClose(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            جزئیات و اصلاحات روزانه - {summary.personnel_name}
          </DialogTitle>
          <DialogDescription>
            تاریخ: {attendanceUtils.formatDate(summary.date)} | 
            شیفت: {summary.shift_name || 'نامشخص'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Information */}
          <Card>
            <CardHeader>
              <CardTitle>خلاصه اطلاعات</CardTitle>
              <CardDescription>
                اطلاعات محاسبه‌شده برای این روز
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.total_presence}
                  </div>
                  <div className="text-sm text-muted-foreground">مجموع حضور</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {summary.total_delay}
                  </div>
                  <div className="text-sm text-muted-foreground">تأخیر</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.total_overtime}
                  </div>
                  <div className="text-sm text-muted-foreground">اضافه‌کار</div>
                </div>
                <div className="text-center">
                  <Badge className={attendanceUtils.getStatusColor(summary.status)}>
                    {attendanceUtils.getStatusText(summary.status)}
                  </Badge>
                  <div className="text-sm text-muted-foreground mt-1">وضعیت</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">اولین ورود:</span> {summary.first_in || '-'}
                </div>
                <div>
                  <span className="font-medium">آخرین خروج:</span> {summary.last_out || '-'}
                </div>
                <div>
                  <span className="font-medium">تعداد ترددها:</span> {summary.raw_logs_count}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Logs Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ترددهای ثبت‌شده</CardTitle>
                  <CardDescription>
                    لیست تمام کارت‌زنی‌های ثبت‌شده در این روز
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddForm(true)}
                  size="sm"
                  className="flex items-center"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  افزودن تردد دستی
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add New Log Form */}
              {showAddForm && (
                <Card className="mb-4 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg">افزودن تردد جدید</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>زمان تردد</Label>
                        <Input
                          type="time"
                          value={newLog.log_time}
                          onChange={(e) => setNewLog(prev => ({ 
                            ...prev, 
                            log_time: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>نوع تردد</Label>
                        <Select 
                          value={newLog.log_type} 
                          onValueChange={(value: any) => setNewLog(prev => ({ 
                            ...prev, 
                            log_type: value 
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">ورود</SelectItem>
                            <SelectItem value="OUT">خروج</SelectItem>
                            <SelectItem value="BREAK_IN">ورود استراحت</SelectItem>
                            <SelectItem value="BREAK_OUT">خروج استراحت</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>دستگاه</Label>
                        <Input
                          placeholder="دستگاه (اختیاری)"
                          value={newLog.device_id}
                          onChange={(e) => setNewLog(prev => ({ 
                            ...prev, 
                            device_id: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button onClick={handleAddLog} size="sm">
                        <Save className="mr-1 h-4 w-4" />
                        ذخیره
                      </Button>
                      <Button 
                        onClick={() => setShowAddForm(false)} 
                        variant="outline" 
                        size="sm"
                      >
                        <X className="mr-1 h-4 w-4" />
                        انصراف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Edit Log Form */}
              {editingLog && (
                <Card className="mb-4 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg">ویرایش تردد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>زمان تردد</Label>
                        <Input
                          type="time"
                          value={editingLog.log_time}
                          onChange={(e) => setEditingLog(prev => ({ 
                            ...prev, 
                            log_time: e.target.value 
                          }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>نوع تردد</Label>
                        <Select 
                          value={editingLog.log_type} 
                          onValueChange={(value: any) => setEditingLog(prev => ({ 
                            ...prev, 
                            log_type: value 
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN">ورود</SelectItem>
                            <SelectItem value="OUT">خروج</SelectItem>
                            <SelectItem value="BREAK_IN">ورود استراحت</SelectItem>
                            <SelectItem value="BREAK_OUT">خروج استراحت</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>دستگاه</Label>
                        <Input
                          placeholder="دستگاه (اختیاری)"
                          value={editingLog.device_id || ''}
                          onChange={(e) => setEditingLog(prev => ({ 
                            ...prev, 
                            device_id: e.target.value 
                          }))}
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button onClick={handleUpdateLog} size="sm">
                        <Save className="mr-1 h-4 w-4" />
                        ذخیره تغییرات
                      </Button>
                      <Button 
                        onClick={() => setEditingLog(null)} 
                        variant="outline" 
                        size="sm"
                      >
                        <X className="mr-1 h-4 w-4" />
                        انصراف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Logs Table */}
              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="mr-2">در حال بارگیری...</span>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>زمان</TableHead>
                        <TableHead>نوع تردد</TableHead>
                        <TableHead>دستگاه</TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            هیچ ترددی ثبت نشده است
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawLogs
                          .sort((a, b) => new Date(a.log_time).getTime() - new Date(b.log_time).getTime())
                          .map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">
                                {attendanceUtils.formatTime(log.log_time)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {attendanceUtils.getLogTypeText(log.log_type)}
                                </Badge>
                              </TableCell>
                              <TableCell>{log.device_id || '-'}</TableCell>
                              <TableCell>
                                {log.is_manual ? (
                                  <Badge variant="secondary">دستی</Badge>
                                ) : (
                                  <Badge variant="outline">خودکار</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingLog(log)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteLog(log.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
            >
              بستن
            </Button>
            
            <Button
              onClick={handleReprocessDay}
              disabled={reprocessing || !hasChanges}
              className="flex items-center"
            >
              {reprocessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              پردازش مجدد این روز
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}