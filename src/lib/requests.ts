import axios from 'axios';

// TypeScript Types

// Request Status Types
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

// Request Type Types
export type RequestType = 'LEAVE' | 'MISSION';

// Leave Types
export interface LeaveType {
  id: number;
  name: string;
  description?: string;
  requires_document: boolean;
  max_days?: number;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mission Types
export interface MissionType {
  id: number;
  name: string;
  description?: string;
  requires_document: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Base Request Interface
export interface BaseRequest {
  id: string;
  personnel_id: string;
  personnel_name: string;
  request_type: RequestType;
  status: RequestStatus;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_hourly: boolean;
  description?: string;
  reject_reason?: string;
  approver_id?: string;
  approver_name?: string;
  created_at: string;
  updated_at: string;
}

// Leave Request Interface
export interface LeaveRequest extends BaseRequest {
  request_type: 'LEAVE';
  leave_type_id: number;
  leave_type_name: string;
  leave_type_is_paid: boolean;
  document_path?: string;
}

// Mission Request Interface
export interface MissionRequest extends BaseRequest {
  request_type: 'MISSION';
  mission_type_id: number;
  mission_type_name: string;
  destination?: string;
  estimated_cost?: number;
  document_path?: string;
}

// Combined Request Type
export type Request = LeaveRequest | MissionRequest;

// Create Request Data
export interface CreateLeaveRequestData {
  personnel_id: string;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_hourly: boolean;
  description?: string;
  document?: File;
}

export interface CreateMissionRequestData {
  personnel_id: string;
  mission_type_id: number;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  is_hourly: boolean;
  description?: string;
  destination?: string;
  estimated_cost?: number;
  document?: File;
}

// Update Request Status Data
export interface UpdateRequestStatusData {
  status: RequestStatus;
  reject_reason?: string;
}

// Request Filters
export interface RequestFilters {
  request_type?: RequestType;
  status?: RequestStatus;
  personnel_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// API Response Types
export interface RequestsResponse {
  data: Request[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeaveTypesResponse {
  data: LeaveType[];
}

export interface MissionTypesResponse {
  data: MissionType[];
}

// API Functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const requestsAPI = {
  // Leave Requests
  async getLeaveRequests(filters?: RequestFilters): Promise<RequestsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/api/leave-requests?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      throw error;
    }
  },

  async createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'document' && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await axios.post(`${API_BASE_URL}/api/leave-requests`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating leave request:', error);
      throw error;
    }
  },

  async updateLeaveRequestStatus(id: string, data: UpdateRequestStatusData): Promise<LeaveRequest> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/leave-requests/${id}/status`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw error;
    }
  },

  async getLeaveTypes(): Promise<LeaveTypesResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/leave-types`);
      return response.data;
    } catch (error) {
      console.error('Error fetching leave types:', error);
      throw error;
    }
  },

  // Mission Requests
  async getMissionRequests(filters?: RequestFilters): Promise<RequestsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/api/mission-requests?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mission requests:', error);
      throw error;
    }
  },

  async createMissionRequest(data: CreateMissionRequestData): Promise<MissionRequest> {
    try {
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'document' && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      const response = await axios.post(`${API_BASE_URL}/api/mission-requests`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating mission request:', error);
      throw error;
    }
  },

  async updateMissionRequestStatus(id: string, data: UpdateRequestStatusData): Promise<MissionRequest> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/mission-requests/${id}/status`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating mission request status:', error);
      throw error;
    }
  },

  async getMissionTypes(): Promise<MissionTypesResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mission-types`);
      return response.data;
    } catch (error) {
      console.error('Error fetching mission types:', error);
      throw error;
    }
  },

  // Combined requests for convenience
  async getRequests(filters?: RequestFilters): Promise<RequestsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await axios.get(`${API_BASE_URL}/api/requests?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
  }
};

// Utility functions
export const requestsUtils = {
  // Get status color for UI
  getStatusColor(status: RequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  // Get status text in Persian
  getStatusText(status: RequestStatus): string {
    switch (status) {
      case 'PENDING':
        return 'در انتظار';
      case 'APPROVED':
        return 'تأیید شده';
      case 'REJECTED':
        return 'رد شده';
      case 'CANCELLED':
        return 'لغو شده';
      default:
        return status;
    }
  },

  // Get request type text in Persian
  getRequestTypeText(type: RequestType): string {
    switch (type) {
      case 'LEAVE':
        return 'مرخصی';
      case 'MISSION':
        return 'مأموریت';
      default:
        return type;
    }
  },

  // Format date range for display
  formatDateRange(startDate: string, endDate: string, isHourly: boolean): string {
    const start = new Date(startDate).toLocaleDateString('fa-IR');
    const end = new Date(endDate).toLocaleDateString('fa-IR');
    
    if (isHourly) {
      return `${start} - ${end}`;
    } else {
      return start === end ? start : `${start} تا ${end}`;
    }
  },

  // Format time range for display
  formatTimeRange(startTime?: string, endTime?: string): string {
    if (!startTime || !endTime) return '';
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      return `${hours}:${minutes}`;
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  },

  // Calculate duration in days or hours
  calculateDuration(
    startDate: string, 
    endDate: string, 
    startTime?: string, 
    endTime?: string,
    isHourly: boolean
  ): string {
    if (isHourly && startTime && endTime) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours} ساعت و ${diffMinutes} دقیقه`;
    } else {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return `${diffDays} روز`;
    }
  },

  // Check if user can approve/reject request
  canManageRequest(userRole: string, requestStatus: RequestStatus): boolean {
    return userRole === 'admin' || userRole === 'manager';
  },

  // Check if request can be cancelled
  canCancelRequest(requestStatus: RequestStatus): boolean {
    return requestStatus === 'PENDING';
  }
};