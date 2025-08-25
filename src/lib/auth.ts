// JWT Token Management Utilities

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
}

// Token management functions
const tokenManager = {
  // Save token to localStorage
  saveToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  },

  // Get token from localStorage
  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  },

  // Remove token from localStorage
  removeToken: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  },

  // Save user info to localStorage
  saveUser: (user: User): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_info', JSON.stringify(user));
    }
  },

  // Get user info from localStorage
  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        try {
          return JSON.parse(userInfo);
        } catch (error) {
          console.error('Error parsing user info:', error);
          return null;
        }
      }
    }
    return null;
  },

  // Remove user info from localStorage
  removeUser: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_info');
    }
  },

  // Clear all auth data
  clearAuth: (): void => {
    tokenManager.removeToken();
    tokenManager.removeUser();
  },

  // Get current auth state
  getAuthState: (): AuthState => {
    const token = tokenManager.getToken();
    const user = tokenManager.getUser();
    
    return {
      user,
      token,
      isAuthenticated: !!token && !!user,
    };
  },

  // Check if token is expired (simple check - in production, you'd decode the JWT)
  isTokenExpired: (token: string): boolean => {
    try {
      // This is a simple check. In production, you'd decode the JWT and check the exp claim
      if (!token) return true;
      
      // For now, just check if token exists and has reasonable length
      return token.length < 10;
    } catch (error) {
      return true;
    }
  },

  // Validate current token
  validateToken: (): boolean => {
    const token = tokenManager.getToken();
    if (!token) return false;
    
    return !tokenManager.isTokenExpired(token);
  },
};

// Auth helper functions
const authHelpers = {
  // Login user and save auth data
  login: (token: string, user: User): void => {
    tokenManager.saveToken(token);
    tokenManager.saveUser(user);
  },

  // Logout user and clear auth data
  logout: (): void => {
    tokenManager.clearAuth();
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return tokenManager.validateToken();
  },

  // Get current user
  getCurrentUser: (): User | null => {
    return tokenManager.getUser();
  },

  // Get user role
  getUserRole: (): string | null => {
    const user = tokenManager.getUser();
    return user?.role || null;
  },

  // Check if user has specific role
  hasRole: (role: string): boolean => {
    const userRole = authHelpers.getUserRole();
    return userRole === role;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (roles: string[]): boolean => {
    const userRole = authHelpers.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  },
};

// Role-based access control
const rbac = {
  // Define role permissions
  permissions: {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_system'],
    manager: ['read', 'write', 'manage_personnel', 'approve_requests'],
    user: ['read', 'create_requests'],
  },

  // Check if user has permission
  hasPermission: (permission: string): boolean => {
    const userRole = authHelpers.getUserRole();
    if (!userRole) return false;
    
    const rolePermissions = rbac.permissions[userRole as keyof typeof rbac.permissions];
    return rolePermissions?.includes(permission) || false;
  },

  // Check if user can access a route
  canAccess: (requiredRole?: string): boolean => {
    if (!requiredRole) return true;
    
    const userRole = authHelpers.getUserRole();
    if (!userRole) return false;
    
    // Admin can access everything
    if (userRole === 'admin') return true;
    
    // Check if user has the required role
    return userRole === requiredRole;
  },
};

// Export everything for easy importing
export { User, AuthState, tokenManager, authHelpers, rbac };