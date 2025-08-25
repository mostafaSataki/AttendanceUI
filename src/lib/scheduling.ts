import { shiftsAPI, calendarsAPI, workGroupsAPI, holidaysAPI } from './api';

// TypeScript interfaces for Scheduling data

// Shift interfaces
export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  grace_period?: number;
  is_night_shift?: boolean;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftData {
  name: string;
  start_time: string;
  end_time: string;
  grace_period?: number;
  is_night_shift?: boolean;
  description?: string;
  is_active: boolean;
}

export interface UpdateShiftData extends Partial<CreateShiftData> {
  id: number;
}

// Calendar interfaces
export interface Calendar {
  id: number;
  name: string;
  year: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarData {
  name: string;
  year: number;
  description?: string;
  is_active: boolean;
}

export interface UpdateCalendarData extends Partial<CreateCalendarData> {
  id: number;
}

// Holiday interfaces
export interface Holiday {
  id: number;
  calendar_id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHolidayData {
  calendar_id: number;
  name: string;
  date: string;
  is_recurring: boolean;
  description?: string;
}

export interface UpdateHolidayData extends Partial<CreateHolidayData> {
  id: number;
}

// Work Group interfaces
export interface WorkGroup {
  id: number;
  name: string;
  description?: string;
  repeat_period: number;
  calendar_id: number;
  calendar_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assignments?: WorkGroupShiftAssignment[];
}

export interface CreateWorkGroupData {
  name: string;
  description?: string;
  repeat_period: number;
  calendar_id: number;
  is_active: boolean;
  assignments?: Omit<WorkGroupShiftAssignment, 'id' | 'work_group_id'>[];
}

export interface UpdateWorkGroupData extends Partial<CreateWorkGroupData> {
  id: number;
}

export interface WorkGroupShiftAssignment {
  id: number;
  work_group_id: number;
  day_index: number;
  shift_id: number;
  shift_name?: string;
  created_at: string;
  updated_at: string;
}

// Filter interfaces
export interface ShiftFilters {
  search?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface CalendarFilters {
  year?: number;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface WorkGroupFilters {
  search?: string;
  calendar_id?: number;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface HolidayFilters {
  calendar_id?: number;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

// Response interfaces
export interface ShiftResponse {
  data: Shift[];
  total: number;
  skip: number;
  limit: number;
}

export interface CalendarResponse {
  data: Calendar[];
  total: number;
  skip: number;
  limit: number;
}

export interface WorkGroupResponse {
  data: WorkGroup[];
  total: number;
  skip: number;
  limit: number;
}

export interface HolidayResponse {
  data: Holiday[];
  total: number;
  skip: number;
  limit: number;
}

// API functions for Shifts
export const shiftService = {
  // Get all shifts
  getShifts: async (filters?: ShiftFilters): Promise<ShiftResponse> => {
    const response = await shiftsAPI.getAll(filters);
    return {
      data: response.data?.shifts || [],
      total: response.data?.total || 0,
      skip: filters?.skip || 0,
      limit: filters?.limit || 10,
    };
  },

  // Get single shift by ID
  getShiftById: async (id: number): Promise<Shift> => {
    const response = await shiftsAPI.getById(id);
    return response.data;
  },

  // Create new shift
  createShift: async (data: CreateShiftData): Promise<Shift> => {
    const response = await shiftsAPI.create(data);
    return response.data;
  },

  // Update existing shift
  updateShift: async (id: number, data: Partial<CreateShiftData>): Promise<Shift> => {
    const response = await shiftsAPI.update(id, data);
    return response.data;
  },

  // Delete shift
  deleteShift: async (id: number): Promise<void> => {
    await shiftsAPI.delete(id);
  },

  // Get active shifts
  getActiveShifts: async (): Promise<Shift[]> => {
    const response = await shiftService.getShifts({
      is_active: true,
      limit: 1000,
    });
    return response.data;
  },

  // Validate shift data
  validateShiftData: (data: Partial<CreateShiftData>): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('نام شیفت الزامی است');
    }

    if (!data.start_time) {
      errors.push('ساعت شروع الزامی است');
    }

    if (!data.end_time) {
      errors.push('ساعت پایان الزامی است');
    }

    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      errors.push('ساعت شروع باید قبل از ساعت پایان باشد');
    }

    if (data.grace_period !== undefined && data.grace_period < 0) {
      errors.push('مدت شناوری باید عددی مثبت باشد');
    }

    return errors;
  },
};

// API functions for Calendars
export const calendarService = {
  // Get all calendars
  getCalendars: async (filters?: CalendarFilters): Promise<CalendarResponse> => {
    const response = await calendarsAPI.getAll(filters);
    return {
      data: response.data?.calendars || [],
      total: response.data?.total || 0,
      skip: filters?.skip || 0,
      limit: filters?.limit || 10,
    };
  },

  // Get single calendar by ID
  getCalendarById: async (id: number): Promise<Calendar> => {
    const response = await calendarsAPI.getById(id);
    return response.data;
  },

  // Create new calendar
  createCalendar: async (data: CreateCalendarData): Promise<Calendar> => {
    const response = await calendarsAPI.create(data);
    return response.data;
  },

  // Update existing calendar
  updateCalendar: async (id: number, data: Partial<CreateCalendarData>): Promise<Calendar> => {
    const response = await calendarsAPI.update(id, data);
    return response.data;
  },

  // Delete calendar
  deleteCalendar: async (id: number): Promise<void> => {
    await calendarsAPI.delete(id);
  },

  // Get calendar by year
  getCalendarByYear: async (year: number): Promise<Calendar | null> => {
    const response = await calendarService.getCalendars({
      year,
      limit: 1,
    });
    return response.data[0] || null;
  },

  // Get active calendars
  getActiveCalendars: async (): Promise<Calendar[]> => {
    const response = await calendarService.getCalendars({
      is_active: true,
      limit: 1000,
    });
    return response.data;
  },

  // Validate calendar data
  validateCalendarData: (data: Partial<CreateCalendarData>): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('نام تقویم الزامی است');
    }

    if (!data.year || data.year < 1300 || data.year > 1500) {
      errors.push('سال معتبر نیست');
    }

    return errors;
  },
};

// API functions for Holidays
export const holidayService = {
  // Get all holidays
  getHolidays: async (filters?: HolidayFilters): Promise<HolidayResponse> => {
    const response = await holidaysAPI.getAll(filters);
    return {
      data: response.data?.holidays || [],
      total: response.data?.total || 0,
      skip: filters?.skip || 0,
      limit: filters?.limit || 10,
    };
  },

  // Get single holiday by ID
  getHolidayById: async (id: number): Promise<Holiday> => {
    const response = await holidaysAPI.getById(id);
    return response.data;
  },

  // Create new holiday
  createHoliday: async (data: CreateHolidayData): Promise<Holiday> => {
    const response = await holidaysAPI.create(data);
    return response.data;
  },

  // Update existing holiday
  updateHoliday: async (id: number, data: Partial<CreateHolidayData>): Promise<Holiday> => {
    const response = await holidaysAPI.update(id, data);
    return response.data;
  },

  // Delete holiday
  deleteHoliday: async (id: number): Promise<void> => {
    await holidaysAPI.delete(id);
  },

  // Get holidays by calendar
  getHolidaysByCalendar: async (calendarId: number): Promise<Holiday[]> => {
    const response = await holidayService.getHolidays({
      calendar_id: calendarId,
      limit: 1000,
    });
    return response.data;
  },

  // Get holidays by date range
  getHolidaysByDateRange: async (startDate: string, endDate: string): Promise<Holiday[]> => {
    const response = await holidayService.getHolidays({
      start_date: startDate,
      end_date: endDate,
      limit: 1000,
    });
    return response.data;
  },

  // Validate holiday data
  validateHolidayData: (data: Partial<CreateHolidayData>): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('نام تعطیلی الزامی است');
    }

    if (!data.calendar_id) {
      errors.push('تقویم الزامی است');
    }

    if (!data.date) {
      errors.push('تاریخ تعطیلی الزامی است');
    }

    return errors;
  },
};

// API functions for Work Groups
export const workGroupService = {
  // Get all work groups
  getWorkGroups: async (filters?: WorkGroupFilters): Promise<WorkGroupResponse> => {
    const response = await workGroupsAPI.getAll(filters);
    return {
      data: response.data?.work_groups || [],
      total: response.data?.total || 0,
      skip: filters?.skip || 0,
      limit: filters?.limit || 10,
    };
  },

  // Get single work group by ID
  getWorkGroupById: async (id: number): Promise<WorkGroup> => {
    const response = await workGroupsAPI.getById(id);
    return response.data;
  },

  // Create new work group
  createWorkGroup: async (data: CreateWorkGroupData): Promise<WorkGroup> => {
    const response = await workGroupsAPI.create(data);
    return response.data;
  },

  // Update existing work group
  updateWorkGroup: async (id: number, data: Partial<CreateWorkGroupData>): Promise<WorkGroup> => {
    const response = await workGroupsAPI.update(id, data);
    return response.data;
  },

  // Delete work group
  deleteWorkGroup: async (id: number): Promise<void> => {
    await workGroupsAPI.delete(id);
  },

  // Get work groups by calendar
  getWorkGroupsByCalendar: async (calendarId: number): Promise<WorkGroup[]> => {
    const response = await workGroupService.getWorkGroups({
      calendar_id: calendarId,
      limit: 1000,
    });
    return response.data;
  },

  // Get active work groups
  getActiveWorkGroups: async (): Promise<WorkGroup[]> => {
    const response = await workGroupService.getWorkGroups({
      is_active: true,
      limit: 1000,
    });
    return response.data;
  },

  // Validate work group data
  validateWorkGroupData: (data: Partial<CreateWorkGroupData>): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('نام گروه کاری الزامی است');
    }

    if (!data.repeat_period || data.repeat_period < 1) {
      errors.push('دوره تکرار باید عددی مثبت باشد');
    }

    if (!data.calendar_id) {
      errors.push('تقویم کاری الزامی است');
    }

    return errors;
  },

  // Validate work group assignments
  validateWorkGroupAssignments: (assignments: Omit<WorkGroupShiftAssignment, 'id' | 'work_group_id'>[], repeatPeriod: number): string[] => {
    const errors: string[] = [];

    if (assignments.length !== repeatPeriod) {
      errors.push(`تعداد تخصیص‌های شیفت باید برابر با دوره تکرار (${repeatPeriod}) باشد`);
    }

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      
      if (assignment.day_index < 0 || assignment.day_index >= repeatPeriod) {
        errors.push(`روز ${i + 1} باید بین 0 و ${repeatPeriod - 1} باشد`);
      }

      if (!assignment.shift_id) {
        errors.push(`شیفت برای روز ${i + 1} الزامی است`);
      }
    }

    return errors;
  },
};

// Export all types and services
export type {
  Shift,
  CreateShiftData,
  UpdateShiftData,
  Calendar,
  CreateCalendarData,
  UpdateCalendarData,
  Holiday,
  CreateHolidayData,
  UpdateHolidayData,
  WorkGroup,
  CreateWorkGroupData,
  UpdateWorkGroupData,
  WorkGroupShiftAssignment,
  ShiftFilters,
  CalendarFilters,
  WorkGroupFilters,
  HolidayFilters,
  ShiftResponse,
  CalendarResponse,
  WorkGroupResponse,
  HolidayResponse,
};

export {
  shiftService,
  calendarService,
  holidayService,
  workGroupService,
};