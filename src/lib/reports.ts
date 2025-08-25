import axios from 'axios';

// TypeScript Types

// Report Filters
export interface ReportFilters {
  start_date: string;
  end_date: string;
  personnel_ids?: string[];
  org_unit_ids?: number[];
  department_ids?: number[];
  shift_ids?: number[];
}

// Summary Report Row
export interface SummaryReportRow {
  personnel_id: string;
  personnel_name: string;
  personnel_number: string;
  department?: string;
  org_unit?: string;
  shift_name?: string;
  
  // Attendance Summary
  total_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  mission_days: number;
  
  // Time Summary (in hours)
  total_presence_hours: number;
  total_overtime_hours: number;
  total_delay_hours: number;
  total_early_leave_hours: number;
  
  // Leave Breakdown
  annual_leave_days: number;
  sick_leave_days: number;
  unpaid_leave_days: number;
  
  // Calculations
  working_days: number;
  attendance_percentage: number;
  
  // Additional Info
  first_attendance?: string;
  last_attendance?: string;
}

// Summary Report Response
export interface SummaryReportResponse {
  data: SummaryReportRow[];
  summary: {
    total_personnel: number;
    total_present_days: number;
    total_absent_days: number;
    total_leave_days: number;
    total_mission_days: number;
    total_presence_hours: number;
    total_overtime_hours: number;
    total_delay_hours: number;
    average_attendance_percentage: number;
  };
  filters: ReportFilters;
}

// Payroll Export Data (for internal use)
export interface PayrollExportRow {
  personnel_id: string;
  personnel_number: string;
  personnel_name: string;
  department: string;
  org_unit: string;
  
  // Basic Attendance
  working_days: number;
  present_days: number;
  absent_days: number;
  
  // Leave Data
  annual_leave_days: number;
  sick_leave_days: number;
  unpaid_leave_days: number;
  mission_days: number;
  
  // Time Data (in hours)
  standard_hours: number;
  overtime_hours: number;
  delay_hours: number;
  early_leave_hours: number;
  
  // Calculated Fields
  net_working_hours: number;
  attendance_percentage: number;
}

// Export Format Options
export type ExportFormat = 'CSV' | 'EXCEL' | 'PDF' | 'TXT';

export interface ExportOptions {
  format: ExportFormat;
  include_headers: boolean;
  encoding?: 'UTF-8' | 'WINDOWS-1256';
  separator?: string;
}

// API Functions
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const reportsAPI = {
  // Get summary report data
  async getSummaryReport(filters: ReportFilters): Promise<SummaryReportResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/summary`, filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching summary report:', error);
      throw error;
    }
  },

  // Download payroll export file
  async downloadPayrollExport(
    filters: ReportFilters, 
    options: ExportOptions = { format: 'CSV', include_headers: true }
  ): Promise<Blob> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/payroll-export`, {
        filters,
        options
      }, {
        responseType: 'blob' // Important for file download
      });
      
      return response.data;
    } catch (error) {
      console.error('Error downloading payroll export:', error);
      throw error;
    }
  },

  // Get available report filters (dropdown options)
  async getReportFilters(): Promise<{
    personnel: Array<{ id: string; name: string; number: string }>;
    org_units: Array<{ id: number; name: string }>;
    departments: Array<{ id: number; name: string }>;
    shifts: Array<{ id: number; name: string }>;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/reports/filters`);
      return response.data;
    } catch (error) {
      console.error('Error fetching report filters:', error);
      throw error;
    }
  },

  // Generate detailed attendance report
  async getDetailedAttendanceReport(filters: ReportFilters): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/detailed`, filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed attendance report:', error);
      throw error;
    }
  },

  // Generate leave analysis report
  async getLeaveAnalysisReport(filters: ReportFilters): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reports/leave-analysis`, filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching leave analysis report:', error);
      throw error;
    }
  }
};

// Utility functions
export const reportsUtils = {
  // Format hours for display (e.g., 8.5 -> "8:30")
  formatHours(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}:${minutes.toString().padStart(2, '0')}`;
  },

  // Format percentage for display
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  },

  // Get attendance status color
  getAttendanceStatusColor(percentage: number): string {
    if (percentage >= 95) return 'text-green-600 bg-green-50';
    if (percentage >= 85) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  },

  // Get attendance status text
  getAttendanceStatusText(percentage: number): string {
    if (percentage >= 95) return 'عالی';
    if (percentage >= 85) return 'خوب';
    if (percentage >= 70) return 'متوسط';
    return 'ضعیف';
  },

  // Generate filename for export
  generateExportFilename(format: ExportFormat, startDate: string, endDate: string): string {
    const start = new Date(startDate).toLocaleDateString('fa-IR').replace(/\//g, '-');
    const end = new Date(endDate).toLocaleDateString('fa-IR').replace(/\//g, '-');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    return `payroll-export-${start}-to-${end}-${timestamp}.${format.toLowerCase()}`;
  },

  // Download blob as file
  downloadBlob(blob: Blob, filename: string): void {
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Revoke the temporary URL
    URL.revokeObjectURL(url);
  },

  // Validate report filters
  validateFilters(filters: Partial<ReportFilters>): string[] {
    const errors: string[] = [];

    if (!filters.start_date) {
      errors.push('تاریخ شروع الزامی است');
    }

    if (!filters.end_date) {
      errors.push('تاریخ پایان الزامی است');
    }

    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      
      if (start > end) {
        errors.push('تاریخ شروع باید قبل از تاریخ پایان باشد');
      }

      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        errors.push('بازه زمانی گزارش نباید بیشتر از 365 روز باشد');
      }
    }

    return errors;
  },

  // Calculate summary statistics
  calculateSummaryStats(data: SummaryReportRow[]): {
    totalPersonnel: number;
    averageAttendance: number;
    totalOvertime: number;
    totalDelay: number;
    presentDays: number;
    absentDays: number;
  } {
    if (data.length === 0) {
      return {
        totalPersonnel: 0,
        averageAttendance: 0,
        totalOvertime: 0,
        totalDelay: 0,
        presentDays: 0,
        absentDays: 0
      };
    }

    const totalPersonnel = data.length;
    const averageAttendance = data.reduce((sum, row) => sum + row.attendance_percentage, 0) / totalPersonnel;
    const totalOvertime = data.reduce((sum, row) => sum + row.total_overtime_hours, 0);
    const totalDelay = data.reduce((sum, row) => sum + row.total_delay_hours, 0);
    const presentDays = data.reduce((sum, row) => sum + row.present_days, 0);
    const absentDays = data.reduce((sum, row) => sum + row.absent_days, 0);

    return {
      totalPersonnel,
      averageAttendance,
      totalOvertime,
      totalDelay,
      presentDays,
      absentDays
    };
  },

  // Format date range for display
  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate).toLocaleDateString('fa-IR');
    const end = new Date(endDate).toLocaleDateString('fa-IR');
    
    return start === end ? start : `${start} تا ${end}`;
  },

  // Get export format options
  getExportFormatOptions(): Array<{ value: ExportFormat; label: string; extension: string }> {
    return [
      { value: 'CSV', label: 'CSV (متن جداشده با کاما)', extension: 'csv' },
      { value: 'EXCEL', label: 'Excel (فایل اکسل)', extension: 'xlsx' },
      { value: 'PDF', label: 'PDF (سند قابل چاپ)', extension: 'pdf' },
      { value: 'TXT', label: 'Text (فایل متنی)', extension: 'txt' }
    ];
  }
};