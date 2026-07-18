import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE';
  designation?: string;
  department?: string;
  experience?: number;
  skills?: string;
  profilePhoto?: string;
  phone?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  education?: string;
  resumeBase64?: string;
  resumeFileName?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (credentials: any, rememberMe?: boolean) => Promise<boolean>;
  register: (userDetails: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<boolean>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for the custom logout event from the API interceptor
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-logout', () => {
      set({ user: null, token: null });
    });
  }

  return {
    user: null,
    token: localStorage.getItem('token'),
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    initAuth: async () => {
      const token = get().token;
      if (!token) {
        set({ loading: false });
        return;
      }
      // Check if utilizing client-side mock token
      if (token === 'mock-jwt-token-prologue') {
        const mockUser: User = {
          id: 999,
          name: 'Demo Admin',
          email: 'demo@pm.com',
          role: 'ROLE_ADMIN',
          designation: 'Workspace Manager',
          department: 'Product & Design',
          experience: 8,
          skills: 'React, TypeScript, Tailwind, Figma, Spring Boot',
          createdAt: new Date().toISOString()
        };
        set({ user: mockUser, loading: false });
        return;
      }
      set({ loading: true });
      try {
        const response = await api.get('/api/auth/me');
        set({ user: response.data, loading: false });
      } catch (err: any) {
        console.error('Session validation failed', err);
        localStorage.removeItem('token');
        set({ user: null, token: null, loading: false });
      }
    },

    login: async (credentials, rememberMe = true) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/login', credentials);
        const { accessToken, user } = response.data;
        
        if (rememberMe) {
          localStorage.setItem('token', accessToken);
        } else {
          sessionStorage.setItem('token', accessToken);
        }
        
        set({ token: accessToken, user, loading: false });
        return true;
      } catch (err: any) {
        // Fallback to Demo Mode if backend is unreachable
        if (err.code === 'ERR_NETWORK' || !err.response || err.response.status === 404 || (typeof err.response.data === 'string' && err.response.data.includes('<!DOCTYPE html>'))) {
          console.warn('Backend server unreachable. Logging into client-side Demo Mode.');
          const mockToken = 'mock-jwt-token-prologue';
          const mockUser: User = {
            id: 999,
            name: 'Demo Admin',
            email: credentials.email,
            role: 'ROLE_ADMIN',
            designation: 'Workspace Manager',
            department: 'Product & Design',
            experience: 8,
            skills: 'React, TypeScript, Tailwind, Figma, Spring Boot',
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('token', mockToken);
          set({ token: mockToken, user: mockUser, loading: false });
          alert('Backend server is offline. Logging in to Demo Mode with mock data.');
          return true;
        }

        let message = err.response?.data || 'Failed to authenticate user';
        if (typeof message === 'string' && (message.includes('<!DOCTYPE html>') || message.includes('<html>'))) {
          message = 'Backend server returned a 404 Not Found HTML page. Please verify your VITE_API_BASE_URL environment variable in Netlify settings, and make sure your backend is running.';
        }
        set({ error: typeof message === 'string' ? message : JSON.stringify(message), loading: false });
        return false;
      }
    },

    register: async (userDetails) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/register', userDetails);
        const { accessToken, user } = response.data;
        
        localStorage.setItem('token', accessToken);
        set({ token: accessToken, user, loading: false });
        return true;
      } catch (err: any) {
        // Fallback to Demo Mode if backend is unreachable
        if (err.code === 'ERR_NETWORK' || !err.response || err.response.status === 404 || (typeof err.response.data === 'string' && err.response.data.includes('<!DOCTYPE html>'))) {
          console.warn('Backend server unreachable. Logging into client-side Demo Mode.');
          const mockToken = 'mock-jwt-token-prologue';
          const mockUser: User = {
            id: 999,
            name: userDetails.name,
            email: userDetails.email,
            role: userDetails.role,
            designation: userDetails.designation || 'Software Engineer',
            department: userDetails.department || 'Technology',
            experience: userDetails.experience || 3,
            skills: userDetails.skills || '',
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('token', mockToken);
          set({ token: mockToken, user: mockUser, loading: false });
          alert('Backend server is offline. Logging in to Demo Mode with mock data.');
          return true;
        }

        let message = err.response?.data || 'Registration failed';
        if (typeof message === 'string' && (message.includes('<!DOCTYPE html>') || message.includes('<html>'))) {
          message = 'Backend server returned a 404 Not Found HTML page. Please verify your VITE_API_BASE_URL environment variable in Netlify settings, and make sure your backend is running.';
        }
        set({ error: typeof message === 'string' ? message : JSON.stringify(message), loading: false });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      set({ user: null, token: null, error: null });
    },

    updateProfile: async (profileData) => {
      set({ loading: true, error: null });
      try {
        const response = await api.put('/api/users/profile', profileData);
        set({ user: response.data, loading: false });
        return true;
      } catch (err: any) {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...profileData };
          set({ user: updatedUser, loading: false });
          return true;
        }
        let message = err.response?.data || 'Failed to update profile';
        if (typeof message === 'string' && (message.includes('<!DOCTYPE html>') || message.includes('<html>'))) {
          message = 'Backend server returned a 404 Not Found HTML page. Please verify your VITE_API_BASE_URL environment variable in Netlify settings, and make sure your backend is running.';
        }
        set({ error: typeof message === 'string' ? message : JSON.stringify(message), loading: false });
        return false;
      }
    }
  };
});
