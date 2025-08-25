import axios from 'axios';

// TypeScript Types
export interface AttendanceLog {
  id: string;
  personnel_id: string;
  log_time: string;
  log_type: 'IN' | 'OUT' | 'BREAK_IN' | 'BREAK_OUT';
  device_id?: string;
  is_manual: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  personnel_id: string;
  personnel_name: string;
  date: string;
  shift_id?: string;
  shift_name?: string;
  total_presence: string; // Format: "HH:MM"
  total_delay: string; // Format: "HH:MM"
  total_overtime: string; // Format: "HH:MM"
  status: 'COMPLETE' | 'ABSENT' | 'INCOMPLETE' | 'LEAVE';
  first_in?: string;
  last_out?: string;
  raw_logs_count: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilters {
  personnel_ids?: string[];
  start_date?: string;
  end_date?: string;
  shift_id?: string;
  status?: string;
}

export interface ProcessAttendanceData {
  personnel_ids?: string[];
  start_date: string;
  end_date: string;
  shift_id?: string;
}

export interface ManualLogData {
  personnel_id: string;
  log_time: string;
  log_type: 'IN' | 'OUT' | 'BREAK_IN' | 'BREAK_OUT';
  device_id?: string;
}

// API Functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const attendanceAPI = {
  // Get daily summaries with filters
  async getDailySummaries(filters: AttendanceFilters): Promise<DailySummary[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.personnel_ids?.length) {
        filters.personnel_ids.forEach(id => params.append('personnel_ids', id));
      }
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.shift_id) params.append('shift_id', filters.shift_id);
      if (filters.status) params.append('status', filters.status);

      const response = await axios.get(`${API_BASE_URL}/api/attendance/daily-summaries?${params}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      throw error;
    }
  },

  // Process attendance data
  async processAttendanceData(data: ProcessAttendanceData): Promise<{ message: string; processed_count: number }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/attendance/process`, data);
      return response.data;
    } catch (error) {
      console.error('Error processing attendance data:', error);
      throw error;
    }
  },

  // Get raw logs for a specific personnel and date
  async getRawLogs(personnelId: string, date: string): Promise<AttendanceLog[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/raw-logs?personnel_id=${personnelId}&date=${date}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching raw logs:', error);
      throw error;
    }
  },

  // Add manual log
  async addManualLog(data: ManualLogData): Promise<AttendanceLog> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/attendance/logs`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error adding manual log:', error);
      throw error;
    }
  },

  // Update log
  async updateLog(id: string, data: Partial<ManualLogData>): Promise<AttendanceLog> {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/attendance/logs/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating log:', error);
      throw error;
    }
  },

  // Delete log
  async deleteLog(id: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/api/attendance/logs/${id}`);
    } catch (error) {
      console.error('Error deleting log:', error);
      throw error;
    }
  },

  // Reprocess single day
  async reprocessDay(personnelId: string, date: string): Promise<DailySummary> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/attendance/reprocess`, {
        personnel_id: personnelId,
        date: date
      });
      return response.data.data;
    } catch (error) {
      console.error('Error reprocessing day:', error);
      throw error;
    }
  }
};

// Utility functions
export const attendanceUtils = {
  // Format time from "HH:MM:SS" to "HH:MM"
  formatTime(time: string): string {
    return time.slice(0, 5);
  },

  // Format date for display
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fa-IR');
  },

  // Get status color for UI
  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800';
      case 'ABSENT':
        return 'bg-red-100 text-red-800';
      case 'INCOMPLETE':
        return 'bg-yellow-100 text-yellow-800';
      case 'LEAVE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  },

  // Get status text in Persian
  getStatusText(status: string): string {
    switch (status) {
      case 'COMPLETE':
        return 'کامل';
      case 'ABSENT':
        return 'غیبت';
      case 'INCOMPLETE':
        return 'ناقص';
      case 'LEAVE':
        return 'مرخصی';
      default:
        return 'نامشخص';
    }
  },

  // Get log type text in Persian
  getLogTypeText(type: string): string {
    switch (type) {
      case 'IN':
        return 'ورود';
      case 'OUT':
        return 'خروج';
      case 'BREAK_IN':
        return 'ورود استراحت';
      case 'BREAK_OUT':
        return 'خروج استراحت';
      default:
        return type;
    }
  }
};