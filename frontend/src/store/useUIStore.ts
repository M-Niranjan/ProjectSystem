import { create } from 'zustand';

export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';
export type ThemeMode = 'light' | 'dark' | 'system';

export const ACCENT_PRESETS: Record<AccentColor, { color: string; hover: string; light: string; gradient: string; glow: string }> = {
  blue: {
    color: '#3B82F6',
    hover: '#2563EB',
    light: 'rgba(59, 130, 246, 0.15)',
    gradient: 'linear-gradient(135deg, #3B82F6, #6366F1)',
    glow: 'rgba(59, 130, 246, 0.35)'
  },
  purple: {
    color: '#8B5CF6',
    hover: '#7C3AED',
    light: 'rgba(139, 92, 246, 0.15)',
    gradient: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
    glow: 'rgba(139, 92, 246, 0.35)'
  },
  green: {
    color: '#22C55E',
    hover: '#16A34A',
    light: 'rgba(34, 197, 94, 0.15)',
    gradient: 'linear-gradient(135deg, #22C55E, #10B981)',
    glow: 'rgba(34, 197, 94, 0.35)'
  },
  orange: {
    color: '#F97316',
    hover: '#EA580C',
    light: 'rgba(249, 115, 22, 0.15)',
    gradient: 'linear-gradient(135deg, #F97316, #F59E0B)',
    glow: 'rgba(249, 115, 22, 0.35)'
  },
  red: {
    color: '#EF4444',
    hover: '#DC2626',
    light: 'rgba(239, 68, 68, 0.15)',
    gradient: 'linear-gradient(135deg, #EF4444, #F43F5E)',
    glow: 'rgba(239, 68, 68, 0.35)'
  },
  teal: {
    color: '#14B8A6',
    hover: '#0D9488',
    light: 'rgba(20, 184, 166, 0.15)',
    gradient: 'linear-gradient(135deg, #14B8A6, #06B6D4)',
    glow: 'rgba(20, 184, 166, 0.35)'
  },
};

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastNotification {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface DashboardPrefs {
  showWidgets: boolean;
  showStats: boolean;
  showRecentActivity: boolean;
  landingPage: string;
}

interface UIState {
  sidebarExpanded: boolean;
  darkMode: boolean;
  themeMode: ThemeMode;
  accentColor: AccentColor;
  dashboardPrefs: DashboardPrefs;
  activeLanguage: string;
  voiceOverlayOpen: boolean;
  pomodoroTimerOpen: boolean;
  activeView: string;
  selectedProjectId: number | null;
  projectModalOpen: boolean;
  taskModalOpen: boolean;
  preselectedStatus: string | null;
  isTaskEditMode: boolean;
  editingTask: any | null;
  chatContactId: number | null;
  toast: ToastNotification | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  setDashboardPrefs: (prefs: Partial<DashboardPrefs>) => void;
  initTheme: () => void;
  setLanguage: (lang: string) => void;
  setVoiceOverlay: (isOpen: boolean) => void;
  setPomodoroTimer: (isOpen: boolean) => void;
  setView: (view: string, projectId?: number | null) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  setTaskModalOpen: (isOpen: boolean, status?: string | null, isEdit?: boolean, task?: any | null) => void;
  setChatContactId: (id: number | null) => void;
}

const applyAccentStyles = (accent: AccentColor) => {
  const preset = ACCENT_PRESETS[accent] || ACCENT_PRESETS.blue;
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', preset.color);
    root.style.setProperty('--accent-hover', preset.hover);
    root.style.setProperty('--accent-light', preset.light);
    root.style.setProperty('--accent-gradient', preset.gradient);
    root.style.setProperty('--accent-glow', preset.glow);

    // Override Tailwind v4 / standard CSS color variables dynamically
    root.style.setProperty('--color-blue-500', preset.color);
    root.style.setProperty('--color-blue-600', preset.hover);
    root.style.setProperty('--color-indigo-600', preset.hover);
  }
};

const getInitialView = (): string => {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const pathMap: Record<string, string> = {
      '/dashboard': 'dashboard',
      '/admin/dashboard': 'dashboard',
      '/team-lead/dashboard': 'dashboard',
      '/employee/dashboard': 'dashboard',
      '/projects': 'projects',
      '/my-projects': 'my-projects',
      '/tasks': 'tasks',
      '/my-tasks': 'my-tasks',
      '/boards': 'boards',
      '/calendar': 'calendar',
      '/timeline': 'timeline',
      '/time-tracking': 'time-tracking',
      '/teams': 'teams',
      '/messages': 'messages',
      '/reports': 'reports',
      '/settings': 'settings',
      '/profile': 'profile',
      '/documents': 'documents',
      '/users': 'users',
      '/roles': 'roles',
      '/organization': 'organization',
      '/audit-logs': 'audit-logs',
      '/workspace-activity': 'workspace-activity',
      '/team-tracking': 'team-tracking',
      '/step-verification': 'step-verification',
      '/reviews': 'reviews',
      '/performance': 'performance',
    };
    return pathMap[path] || 'dashboard';
  }
  return 'dashboard';
};

export const useUIStore = create<UIState>((set, get) => ({
  sidebarExpanded: typeof localStorage !== 'undefined' ? localStorage.getItem('sidebarExpanded') !== 'false' : true,
  darkMode: false,
  themeMode: 'light',
  accentColor: 'blue',
  dashboardPrefs: {
    showWidgets: true,
    showStats: true,
    showRecentActivity: true,
    landingPage: 'dashboard',
  },
  activeLanguage: 'EN',
  voiceOverlayOpen: false,
  pomodoroTimerOpen: false,
  activeView: getInitialView(),
  selectedProjectId: null,
  projectModalOpen: false,
  taskModalOpen: false,
  preselectedStatus: null,
  isTaskEditMode: false,
  editingTask: null,
  chatContactId: null,

  toggleSidebar: () => {
    const nextState = !get().sidebarExpanded;
    set({ sidebarExpanded: nextState });
    localStorage.setItem('sidebarExpanded', String(nextState));
  },

  toggleTheme: () => {
    const nextDark = !get().darkMode;
    const nextMode: ThemeMode = nextDark ? 'dark' : 'light';
    set({ darkMode: nextDark, themeMode: nextMode });
    localStorage.setItem('theme', nextMode);
    localStorage.setItem('themeMode', nextMode);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setThemeMode: (mode: ThemeMode) => {
    let isDark = false;
    if (mode === 'dark') {
      isDark = true;
    } else if (mode === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    set({ themeMode: mode, darkMode: isDark });
    localStorage.setItem('themeMode', mode);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setAccentColor: (color: AccentColor) => {
    set({ accentColor: color });
    localStorage.setItem('accentColor', color);
    applyAccentStyles(color);
  },

  setDashboardPrefs: (prefs: Partial<DashboardPrefs>) => {
    const updated = { ...get().dashboardPrefs, ...prefs };
    set({ dashboardPrefs: updated });
    localStorage.setItem('dashboardPrefs', JSON.stringify(updated));
  },

  initTheme: () => {
    const savedMode = (localStorage.getItem('themeMode') || 'light') as ThemeMode;
    const savedAccent = (localStorage.getItem('accentColor') || 'blue') as AccentColor;
    const savedPrefs = localStorage.getItem('dashboardPrefs');

    let isDark = savedMode === 'dark';
    if (savedMode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    set({
      themeMode: savedMode,
      darkMode: isDark,
      accentColor: savedAccent,
      dashboardPrefs: savedPrefs ? JSON.parse(savedPrefs) : get().dashboardPrefs,
    });

    applyAccentStyles(savedAccent);

    if (typeof document !== 'undefined') {
      document.documentElement.removeAttribute('data-density');
      document.documentElement.style.removeProperty('--density-scale');
      document.documentElement.style.removeProperty('--density-padding');
    }

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setLanguage: (lang) => set({ activeLanguage: lang }),
  setVoiceOverlay: (isOpen) => set({ voiceOverlayOpen: isOpen }),
  setPomodoroTimer: (isOpen) => set({ pomodoroTimerOpen: isOpen }),
  setView: (view, projectId = null) => set({ activeView: view, selectedProjectId: projectId }),
  setProjectModalOpen: (isOpen) => set({ projectModalOpen: isOpen }),
  setTaskModalOpen: (isOpen, status = null, isEdit = false, task = null) => set({ 
    taskModalOpen: isOpen, 
    preselectedStatus: status, 
    isTaskEditMode: isEdit, 
    editingTask: task 
  }),
  setChatContactId: (id) => set({ chatContactId: id }),
  toast: null,
  showToast: (message: string, type: ToastType = 'success', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    set({ toast: { id, message, type, duration } });
  },
  hideToast: () => set({ toast: null })
}));

// Listen for global custom events to trigger toasts from non-React contexts
if (typeof window !== 'undefined') {
  window.addEventListener('app-toast', (e: any) => {
    const { message, type, duration } = e.detail || {};
    if (message) {
      useUIStore.getState().showToast(message, type || 'success', duration);
    }
  });
}
