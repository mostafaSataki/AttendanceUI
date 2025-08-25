// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API response interface
interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

// Generic API request function
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage (client-side only)
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('access_token');
  }

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Authentication API functions
export const authAPI = {
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }

    return response.json();
  },

  register: async (userData: {
    email: string;
    username: string;
    full_name: string;
    password: string;
    role?: string;
  }) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

// Organization Units API
export const orgUnitsAPI = {
  getAll: async (params?: { skip?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/org-units${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/org-units/${id}`);
  },

  create: async (data: any) => {
    return apiRequest('/org-units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: any) => {
    return apiRequest(`/org-units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiRequest(`/org-units/${id}`, {
      method: 'DELETE',
    });
  },
};

// Personnel API
export const personnelAPI = {
  getAll: async (params?: { skip?: number; limit?: number; search?: string; org_unit_id?: number }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/personnel${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/personnel/${id}`);
  },

  create: async (data: any) => {
    return apiRequest('/personnel', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: any) => {
    return apiRequest(`/personnel/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiRequest(`/personnel/${id}`, {
      method: 'DELETE',
    });
  },
};

// Shifts API
export const shiftsAPI = {
  getAll: async (params?: { skip?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/shifts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/shifts/${id}`);
  },

  create: async (data: any) => {
    return apiRequest('/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: any) => {
    return apiRequest(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiRequest(`/shifts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Attendance API
export const attendanceAPI = {
  getLogs: async (params?: {
    skip?: number;
    limit?: number;
    personnel_id?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/attendance/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  createLog: async (data: any) => {
    return apiRequest('/attendance/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  processLogs: async () => {
    return apiRequest('/attendance/process', {
      method: 'POST',
    });
  },

  getDailySummaries: async (params?: {
    skip?: number;
    limit?: number;
    personnel_id?: number;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/attendance/daily-summaries${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },
};

// Leave Requests API
export const leaveRequestsAPI = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    personnel_id?: number;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/leave-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/leave-requests/${id}`);
  },

  create: async (data: any) => {
    return apiRequest('/leave-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: any) => {
    return apiRequest(`/leave-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  approve: async (id: number) => {
    return apiRequest(`/leave-requests/${id}/approve`, {
      method: 'POST',
    });
  },

  reject: async (id: number, reason: string) => {
    return apiRequest(`/leave-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};

// Mission Requests API
export const missionRequestsAPI = {
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    personnel_id?: number;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return apiRequest(`/mission-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
  },

  getById: async (id: number) => {
    return apiRequest(`/mission-requests/${id}`);
  },

  create: async (data: any) => {
    return apiRequest('/mission-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: any) => {
    return apiRequest(`/mission-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  approve: async (id: number) => {
    return apiRequest(`/mission-requests/${id}/approve`, {
      method: 'POST',
    });
  },

  reject: async (id: number, reason: string) => {
    return apiRequest(`/mission-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};