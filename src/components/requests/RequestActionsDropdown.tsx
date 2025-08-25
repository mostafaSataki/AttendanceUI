'use client';

import { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MoreHorizontal, 
  Check, 
  X, 
  Trash2, 
  Eye,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Import types and utilities
import { 
  Request, 
  RequestStatus, 
  requestsUtils 
} from '@/lib/requests';

interface RequestActionsDropdownProps {
  request: Request;
  canManage: boolean;
  canCancel: boolean;
  onStatusUpdate: (requestId: string, status: RequestStatus, rejectReason?: string) => void;
  onRequestUpdate: () => void;
}

export function RequestActionsDropdown({
  request,
  canManage,
  canCancel,
  onStatusUpdate,
  onRequestUpdate
}: RequestActionsDropdownProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle approve action
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await onStatusUpdate(request.id, 'APPROVED');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reject action
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('لطفاً دلیل رد درخواست را وارد کنید');
      return;
    }

    setIsProcessing(true);
    try {
      await onStatusUpdate(request.id, 'REJECTED', rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel action
  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      await onStatusUpdate(request.id, 'CANCELLED');
      setShowCancelDialog(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get request-specific details
  const getRequestDetails = () => {
    const isLeave = request.request_type === 'LEAVE';
    
    if (isLeave) {
      const leaveRequest = request as any;
      return {
        type: 'مرخصی',
        typeName: leaveRequest.leave_type_name,
        isPaid: leaveRequest.leave_type_is_paid,
        destination: null,
        estimatedCost: null
      };
    } else {
      const missionRequest = request as any;
      return {
        type: 'مأموریت',
        typeName: missionRequest.mission_type_name,
        isPaid: null,
        destination: missionRequest.destination,
        estimatedCost: missionRequest.estimated_cost
      };
    }
  };

  const details = getRequestDetails();

  return (
    <>
      {/* Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* View Details */}
          <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            مشاهده جزئیات
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Management Actions (for managers/admins) */}
          {canManage && request.status === 'PENDING' && (
            <>
              <DropdownMenuItem onClick={handleApprove} className="text-green-600">
                <Check className="mr-2 h-4 w-4" />
                تأیید درخواست
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowRejectDialog(true)} className="text-red-600">
                <X className="mr-2 h-4 w-4" />
                رد درخواست
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Cancel Action (for request owner) */}
          {canCancel && (
            <DropdownMenuItem onClick={() => setShowCancelDialog(true)} className="text-orange-600">
              <Trash2 className="mr-2 h-4 w-4" />
              لغو درخواست
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <X className="mr-2 h-5 w-5" />
              رد درخواست
            </DialogTitle>
            <DialogDescription>
              لطفاً دلیل رد درخواست {details.type} را وارد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">دلیل رد</Label>
              <Textarea
                id="reject-reason"
                placeholder="لطفاً دلیل رد درخواست را به طور کامل توضیح دهید..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">توجه:</p>
                  <p>با رد این درخواست، پرسنل از طریق سیستم مطلع خواهد شد و دلیل رد برای ایشان قابل مشاهده خواهد بود.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={isProcessing || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'در حال پردازش...' : 'رد درخواست'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-600">
              <Trash2 className="mr-2 h-5 w-5" />
              لغو درخواست
            </DialogTitle>
            <DialogDescription>
              آیا از لغو این درخواست {details.type} مطمئن هستید؟
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">توجه:</p>
                <p>با لغو این درخواست، وضعیت آن به "لغو شده" تغییر کرده و دیگر قابل بازیابی نخواهد بود.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleCancel} 
              disabled={isProcessing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? 'در حال پردازش...' : 'لغو درخواست'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              جزئیات درخواست {details.type}
            </DialogTitle>
            <DialogDescription>
              اطلاعات کامل درخواست {details.type} پرسنل
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">پرسنل</Label>
                <p className="text-sm font-medium">{request.personnel_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">وضعیت</Label>
                <Badge className={requestsUtils.getStatusColor(request.status)}>
                  {requestsUtils.getStatusText(request.status)}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">نوع {details.type}</Label>
                <p className="text-sm font-medium">{details.typeName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">نوع درخواست</Label>
                <p className="text-sm font-medium">
                  {request.is_hourly ? 'ساعتی' : 'روزانه'}
                </p>
              </div>
            </div>

            {/* Time Information */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">بازه زمانی</Label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاریخ شروع:</span>
                  <span className="text-sm font-medium">
                    {new Date(request.start_date).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاریخ پایان:</span>
                  <span className="text-sm font-medium">
                    {new Date(request.end_date).toLocaleDateString('fa-IR')}
                  </span>
                </div>
                {request.is_hourly && request.start_time && request.end_time && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">زمان:</span>
                    <span className="text-sm font-medium">
                      {request.start_time} - {request.end_time}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">مدت:</span>
                  <span className="text-sm font-medium">
                    {requestsUtils.calculateDuration(
                      request.start_date,
                      request.end_date,
                      request.start_time,
                      request.end_time,
                      request.is_hourly
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Mission-specific Information */}
            {details.destination && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">مقصد</Label>
                <p className="text-sm">{details.destination}</p>
              </div>
            )}

            {details.estimatedCost && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">هزینه تخمینی</Label>
                <p className="text-sm">{details.estimatedCost.toLocaleString()} تومان</p>
              </div>
            )}

            {/* Description */}
            {request.description && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">توضیحات</Label>
                <p className="text-sm bg-gray-50 rounded-lg p-3">
                  {request.description}
                </p>
              </div>
            )}

            {/* Reject Reason */}
            {request.reject_reason && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-600">دلیل رد</Label>
                <p className="text-sm bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                  {request.reject_reason}
                </p>
              </div>
            )}

            {/* Approval Information */}
            {request.approver_name && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">اطلاعات تأیید</Label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">تأیید کننده:</span>
                    <span className="text-sm font-medium">{request.approver_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">تاریخ تأیید:</span>
                    <span className="text-sm font-medium">
                      {new Date(request.updated_at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Creation Information */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">اطلاعات ثبت</Label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">تاریخ ثبت:</span>
                  <span className="text-sm font-medium">
                    {new Date(request.created_at).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDetailsDialog(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}