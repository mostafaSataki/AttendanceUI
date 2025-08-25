import { personnelAPI } from './api';

// TypeScript interfaces for Personnel data
export interface Personnel {
  id: number;
  personnel_number: string;
  card_number: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  org_unit_id: number;
  org_unit_name?: string;
  shift_id?: number;
  shift_name?: string;
  work_group_id?: number;
  work_group_name?: string;
  is_active: boolean;
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonnelData {
  personnel_number: string;
  card_number: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  org_unit_id: number;
  shift_id?: number;
  work_group_id?: number;
  is_active: boolean;
  hire_date?: string;
}

export interface UpdatePersonnelData extends Partial<CreatePersonnelData> {
  id: number;
}

export interface PersonnelFilters {
  search?: string;
  org_unit_id?: number;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface PersonnelResponse {
  data: Personnel[];
  total: number;
  skip: number;
  limit: number;
}

// API functions for personnel management
export const personnelService = {
  // Get all personnel with optional filters
  getPersonnel: async (filters?: PersonnelFilters): Promise<PersonnelResponse> => {
    const response = await personnelAPI.getAll(filters);
    return {
      data: response.data?.personnel || [],
      total: response.data?.total || 0,
      skip: filters?.skip || 0,
      limit: filters?.limit || 10,
    };
  },

  // Get single personnel by ID
  getPersonnelById: async (id: number): Promise<Personnel> => {
    const response = await personnelAPI.getById(id);
    return response.data;
  },

  // Create new personnel
  createPersonnel: async (data: CreatePersonnelData): Promise<Personnel> => {
    const response = await personnelAPI.create(data);
    return response.data;
  },

  // Update existing personnel
  updatePersonnel: async (id: number, data: Partial<CreatePersonnelData>): Promise<Personnel> => {
    const response = await personnelAPI.update(id, data);
    return response.data;
  },

  // Delete personnel
  deletePersonnel: async (id: number): Promise<void> => {
    await personnelAPI.delete(id);
  },

  // Search personnel
  searchPersonnel: async (query: string, orgUnitId?: number): Promise<Personnel[]> => {
    const filters: PersonnelFilters = {
      search: query,
      org_unit_id: orgUnitId,
      limit: 50, // Limit search results
    };
    const response = await personnelService.getPersonnel(filters);
    return response.data;
  },

  // Get active personnel count
  getActivePersonnelCount: async (): Promise<number> => {
    const response = await personnelService.getPersonnel({
      is_active: true,
      limit: 1, // We only need the count
    });
    return response.total;
  },

  // Get personnel by organization unit
  getPersonnelByOrgUnit: async (orgUnitId: number): Promise<Personnel[]> => {
    const response = await personnelService.getPersonnel({
      org_unit_id: orgUnitId,
      limit: 1000, // Get all personnel in the unit
    });
    return response.data;
  },

  // Get personnel by shift
  getPersonnelByShift: async (shiftId: number): Promise<Personnel[]> => {
    const response = await personnelService.getPersonnel({
      skip: 0,
      limit: 1000,
    });
    return response.data.filter(p => p.shift_id === shiftId);
  },

  // Bulk update personnel status
  bulkUpdateStatus: async (personnelIds: number[], isActive: boolean): Promise<void> => {
    // This would typically be implemented as a bulk API endpoint
    // For now, we'll update them one by one
    const updatePromises = personnelIds.map(id => 
      personnelService.updatePersonnel(id, { is_active: isActive })
    );
    await Promise.all(updatePromises);
  },

  // Validate personnel data
  validatePersonnelData: (data: Partial<CreatePersonnelData>): string[] => {
    const errors: string[] = [];

    if (!data.personnel_number || data.personnel_number.trim() === '') {
      errors.push('شماره پرسنلی الزامی است');
    }

    if (!data.card_number || data.card_number.trim() === '') {
      errors.push('شماره کارت الزامی است');
    }

    if (!data.full_name || data.full_name.trim() === '') {
      errors.push('نام کامل الزامی است');
    }

    if (!data.email || data.email.trim() === '') {
      errors.push('ایمیل الزامی است');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('ایمیل معتبر نیست');
    }

    if (!data.org_unit_id) {
      errors.push('واحد سازمانی الزامی است');
    }

    return errors;
  },
};

// Export types for use in components
export type { Personnel, CreatePersonnelData, UpdatePersonnelData, PersonnelFilters, PersonnelResponse };