import { create } from 'zustand';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    username: string;
    full_name: string;
    password: string;
    role?: string;
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const result = await response.json();
      
      // Store token in localStorage
      localStorage.setItem('access_token', result.token);
      
      // Create user object from response
      const user = {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        full_name: result.user.fullName,
        role: result.user.role,
        is_active: result.user.isActive,
      };
      
      set({
        user,
        token: result.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      });
      
      // Clear localStorage on error
      localStorage.removeItem('access_token');
      
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    
    try {
      await authAPI.register(userData);
      set({ isLoading: false, error: null });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      set({
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  },

  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    
    // Clear localStorage
    localStorage.removeItem('access_token');
  },

  clearError: () => {
    set({ error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    
    try {
      // Check if we have a token in localStorage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }
      
      // For now, we'll assume the token is valid if it exists
      // In a real app, you might want to validate the token with the backend
      // We'll set authenticated state based on token existence
      set({
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Token is invalid or expired
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      
      // Clear localStorage
      localStorage.removeItem('access_token');
    }
  },

  // Helper method to set state directly
  setState: (newState: Partial<AuthState>) => {
    set(newState);
  },
}));