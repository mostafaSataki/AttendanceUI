import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

interface User {
  id: number;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authAPI.login(email, password);
          
          // Store token in localStorage
          localStorage.setItem('access_token', response.access_token);
          
          // Get user info
          const userResponse = await authAPI.getCurrentUser();
          
          set({
            user: userResponse,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          
          // Store user info in localStorage
          localStorage.setItem('user_info', JSON.stringify(userResponse));
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          
          // Clear localStorage on error
          localStorage.removeItem('access_token');
          localStorage.removeItem('user_info');
          
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
        localStorage.removeItem('user_info');
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        
        try {
          // Check if we have a token in localStorage
          const token = localStorage.getItem('access_token');
          const userInfo = localStorage.getItem('user_info');
          
          if (!token || !userInfo) {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }
          
          // Verify token is still valid by getting current user
          const userResponse = await authAPI.getCurrentUser();
          
          set({
            user: userResponse,
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
          localStorage.removeItem('user_info');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);