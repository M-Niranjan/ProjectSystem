import { create } from 'zustand';
import api from '../services/api';
import { firebaseAuth, fetchFirestoreUserDoc, upsertFirestoreUserDoc, sendResetPasswordEmail, verifyResetCode, resetPasswordWithCode } from '../services/firebase';
import { normalizeRole } from '../services/authRoles';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE';
  designation?: string;
  department?: string;
  experience?: number;
  skills?: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
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
  loginWithFirebase: (firebaseUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }, rememberMe?: boolean) => Promise<boolean>;
  register: (userDetails: any) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  confirmResetPassword: (oobCode: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestOtp: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
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
    token: null,
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    initAuth: async () => {
      set({ loading: true });

      try {
        {
          // Wait for Firebase Auth to initialize asynchronously from IndexedDB/localStorage
          const firebaseUser = await new Promise<any>((resolve) => {
            if (firebaseAuth.currentUser) {
              resolve(firebaseAuth.currentUser);
              return;
            }
            const unsubscribe = firebaseAuth.onAuthStateChanged((u) => {
              unsubscribe();
              resolve(u);
            });
            // 2.5s safety timeout
            setTimeout(() => {
              resolve(firebaseAuth.currentUser);
            }, 2500);
          });

          if (!firebaseUser) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('token');
              localStorage.removeItem('token');
              localStorage.removeItem('mock_user');
            }
            set({
              user: null,
              token: null,
              loading: false,
              error: null,
            });
            return;
          }

          const userData = await fetchFirestoreUserDoc(firebaseUser.uid);

          if (!userData) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('token');
              localStorage.removeItem('token');
              localStorage.removeItem('mock_user');
            }
            set({
              user: null,
              token: null,
              loading: false,
              error: null,
            });
            return;
          }

          const rawRole = (userData as any).role ?? (userData as any).roleCode;
          const roleEnum = normalizeRole(rawRole);
          if (!roleEnum) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('token');
              localStorage.removeItem('token');
            }
            set({
              user: null,
              token: null,
              loading: false,
              error: 'Invalid user role. Please contact your administrator.',
            });
            return;
          }

          const activeUser: User = {
            id: firebaseUser.uid as any,
            email: firebaseUser.email || '',
            name:
              (userData as any).name ||
              (userData as any).displayName ||
              firebaseUser.displayName ||
              (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
            role: roleEnum,
            designation:
              (userData as any).designation ||
              (roleEnum === 'ROLE_ADMIN'
                ? 'System Administrator'
                : roleEnum === 'ROLE_MANAGER'
                  ? 'Project Lead'
                  : 'Software Engineer'),
            department:
              (userData as any).department ||
              (roleEnum === 'ROLE_ADMIN'
                ? 'Executive'
                : roleEnum === 'ROLE_MANAGER'
                  ? 'Management'
                  : 'Engineering'),
            experience: (userData as any).experience || 5,
            skills: (userData as any).skills || '',
            gender: (userData as any).gender || 'Male',
            profilePhoto: (firebaseUser.photoURL && !firebaseUser.photoURL.includes('unsplash.com')) ? firebaseUser.photoURL : ((userData as any).profilePhoto && !(userData as any).profilePhoto.includes('unsplash.com')) ? (userData as any).profilePhoto : undefined,
            createdAt: (userData as any).createdAt || new Date().toISOString(),
          };

          console.log('[Auth] Restored Firebase UID:', firebaseUser.uid);
          console.log('[Auth] Firestore role:', rawRole);
          console.log('[Auth] Normalized role:', roleEnum);

          set({
            user: activeUser,
            token: await firebaseUser.getIdToken(),
            loading: false,
            error: null,
          });
          return;
        }
      } catch (err: any) {
        console.error('[Auth] Session restore failed:', err);

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('token');
          localStorage.removeItem('token');
          localStorage.removeItem('mock_user');
        }

        set({
          user: null,
          token: null,
          loading: false,
          error: null,
        });
      }
    },

    login: async (credentials, rememberMe = true) => {
      set({ loading: true, error: null });
      try {
        const response = await api.post('/api/auth/login', credentials);
        const { accessToken, user } = response.data;

        sessionStorage.setItem('token', accessToken);
        if (rememberMe) {
          localStorage.setItem('token', accessToken);
        }

        set({ token: accessToken, user, loading: false });
        return true;
      } catch (err: any) {
        let message = err.response?.data || 'Failed to authenticate user';
        if (typeof message === 'string' && (message.includes('<!DOCTYPE html>') || message.includes('<html>'))) {
          message = 'Backend server returned a 404 Not Found HTML page. Please verify your VITE_API_BASE_URL environment variable in Netlify settings, and make sure your backend is running.';
        }
        set({ error: typeof message === 'string' ? message : JSON.stringify(message), loading: false });
        return false;
      }
    },

    loginWithFirebase: async (firebaseUser, rememberMe = true) => {
      set({ loading: true, error: null });
      try {
        let user: User | null = null;
        let token = `firebase:${firebaseUser.uid}`;

        try {
          const res = await api.post('/api/auth/firebase-login', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          });
          if (res.data && res.data.user) {
            user = res.data.user;
            token = res.data.accessToken || token;
          }
        } catch (apiErr: any) {
          if (apiErr.response?.status === 403) {
            console.warn('Backend firebase-login denied; continuing with the verified Firestore role');
          } else {
            console.warn('Backend firebase-login lookup skipped; continuing with the verified Firestore role');
          }
        }

        if (!user) {
          const emailLower = (firebaseUser.email || '').trim().toLowerCase();
          const role = normalizeRole((await fetchFirestoreUserDoc(firebaseUser.uid))?.role);
          if (!role) {
            set({ error: 'Invalid user role. Please contact the administrator.', loading: false });
            return false;
          }
          user = {
            id: 900000 + Array.from(firebaseUser.uid).reduce((total, character) => total + character.charCodeAt(0), 0),
            name: firebaseUser.displayName || emailLower.split('@')[0] || 'Firebase User',
            email: emailLower,
            role,
            designation: role === 'ROLE_ADMIN' ? 'System Administrator' : role === 'ROLE_MANAGER' ? 'Project Lead' : 'Software Engineer',
            department: role === 'ROLE_ADMIN' ? 'Administration' : role === 'ROLE_MANAGER' ? 'Management' : 'Engineering',
            experience: 5,
            skills: 'Project Management, Collaboration',
            gender: 'Male',
            profilePhoto: (firebaseUser.photoURL && !firebaseUser.photoURL.includes('unsplash.com')) ? firebaseUser.photoURL : undefined,
            createdAt: new Date().toISOString(),
          };
        }

        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', token);
        set({ token, user, loading: false, error: null });
        return true;
      } catch (err) {
        console.error('Firebase session setup failed', err);
        set({ error: 'Unable to create your workspace session.', loading: false });
        return false;
      }
    },

    register: async (_userDetails) => {
      set({ error: 'Public registration is disabled. Accounts must be provisioned by an Administrator or Team Leader.', loading: false });
      return false;
    },

    logout: () => {
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      void firebaseAuth.signOut();
      set({ user: null, token: null, error: null });
    },

    updateProfile: async (profileData) => {
      set({ error: null });
      try {
        const response = await api.put('/api/users/profile', profileData);
        const updatedUser = response.data;
        set({ user: updatedUser });
        return true;
      } catch (err: any) {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...profileData };
          set({ user: updatedUser });
          return true;
        }
        let message = err.response?.data || 'Failed to update profile';
        if (typeof message === 'string' && (message.includes('<!DOCTYPE html>') || message.includes('<html>'))) {
          message = 'Backend server returned a 404 Not Found HTML page. Please verify your VITE_API_BASE_URL environment variable in Netlify settings, and make sure your backend is running.';
        }
        set({ error: typeof message === 'string' ? message : JSON.stringify(message) });
        return false;
      }
    },

    requestPasswordReset: async (email: string) => {
      const cleanEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, message: 'Please enter a valid email address.' };
      }
      try {
        await sendResetPasswordEmail(cleanEmail);
        return { success: true, message: 'Password reset email sent. Please check your inbox, Spam, or Promotions folder.' };
      } catch (err: any) {
        console.error('Firebase password reset request failed:', err);
        const code = err?.code || '';
        if (code === 'auth/user-not-found') {
          return { success: false, message: 'No user account found with this email address.' };
        } else if (code === 'auth/invalid-email') {
          return { success: false, message: 'Please enter a valid email address.' };
        } else if (code === 'auth/too-many-requests') {
          return { success: false, message: 'Too many requests. Please wait a moment and try again.' };
        } else if (code === 'auth/network-request-failed') {
          return { success: false, message: 'Network error. Please check your internet connection.' };
        }
        if (code === 'auth/operation-not-allowed') {
          return { success: false, message: 'Password reset is not available right now. Please contact support.' };
        }
        if (code === 'auth/invalid-continue-uri' || code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-api-key') {
          return { success: false, message: 'Password reset is not configured correctly. Please contact support.' };
        }
        return { success: false, message: 'We could not send the password reset email. Please try again later.' };
      }
    },

    confirmResetPassword: async (oobCode: string, newPassword: string) => {
      const cleanPass = newPassword.trim();
      if (!cleanPass || cleanPass.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
      }
      try {
        await resetPasswordWithCode(oobCode, cleanPass);
        return { success: true, message: 'Password changed successfully. You can now sign in with your new password.' };
      } catch (err: any) {
        console.error('Firebase password reset confirmation failed:', err);
        const code = err?.code || '';
        if (code === 'auth/expired-action-code') {
          return { success: false, message: 'The password reset link has expired. Please request a new reset link.' };
        } else if (code === 'auth/invalid-action-code') {
          return { success: false, message: 'The password reset link is invalid or has already been used.' };
        } else if (code === 'auth/weak-password') {
          return { success: false, message: 'The password is too weak. Please choose a stronger password.' };
        }

        return { success: false, message: 'Unable to change your password. Please request a new reset link and try again.' };
      }
    },

    requestOtp: async (email: string) => {
      const cleanEmail = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { success: false, message: 'Please enter a valid email address.' };
      }
      try {
        const response = await api.post('/api/auth/forgot-password', { email: cleanEmail });
        return { success: true, message: response.data.message || '6-digit OTP sent to your email address!' };
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data || 'Failed to send OTP code. Please check your email and try again.';
        return { success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
    },

    verifyOtp: async (email: string, otp: string) => {
      const cleanEmail = email.trim();
      const cleanOtp = otp.trim();
      if (!cleanOtp || cleanOtp.length !== 6) {
        return { success: false, message: 'Please enter a valid 6-digit OTP code.' };
      }
      try {
        const response = await api.post('/api/auth/verify-otp', { email: cleanEmail, otp: cleanOtp });
        return { success: true, message: response.data.message || 'OTP verified successfully!' };
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data || 'Incorrect or expired OTP code. Please try again.';
        return { success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
    },

    resetPasswordWithOtp: async (email: string, otp: string, newPassword: string) => {
      const cleanEmail = email.trim();
      const cleanOtp = otp.trim();
      const cleanPass = newPassword.trim();
      if (!cleanPass || cleanPass.length < 6) {
        return { success: false, message: 'New password must be at least 6 characters.' };
      }
      try {
        const response = await api.post('/api/auth/reset-password', { email: cleanEmail, otp: cleanOtp, newPassword: cleanPass });
        return { success: true, message: response.data.message || 'Password reset successfully!' };
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data || 'Password reset failed. Please try again.';
        return { success: false, message: typeof msg === 'string' ? msg : JSON.stringify(msg) };
      }
    }
  };
});
