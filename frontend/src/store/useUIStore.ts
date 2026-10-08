import { create } from 'zustand';

export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'teal';
export type ThemeMode = 'light' | 'dark';

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

export interface AppearanceSnapshot {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  glassEffects: boolean;
  livePulse: boolean;
  compactMode: boolean;
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
  chatContactId: string | number | null;
  toast: ToastNotification | null;
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode, persist?: boolean) => void;
  setAccentColor: (color: AccentColor, persist?: boolean) => void;
  setDashboardPrefs: (prefs: Partial<DashboardPrefs>) => void;
  initTheme: () => void;
  setLanguage: (lang: string) => void;
  setVoiceOverlay: (isOpen: boolean) => void;
  setPomodoroTimer: (isOpen: boolean) => void;
  setView: (view: string, projectId?: number | null) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  setTaskModalOpen: (isOpen: boolean, status?: string | null, isEdit?: boolean, task?: any | null) => void;
  setChatContactId: (id: string | number | null) => void;
  glassEffects: boolean;
  livePulse: boolean;
  compactMode: boolean;
  savedAppearance: AppearanceSnapshot;
  setGlassEffects: (enabled: boolean, persist?: boolean) => void;
  setLivePulse: (enabled: boolean, persist?: boolean) => void;
  setCompactMode: (enabled: boolean, persist?: boolean) => void;
  commitAppearance: () => void;
  discardAppearance: () => void;
  signOutModalOpen: boolean;
  setSignOutModalOpen: (isOpen: boolean) => void;
  loginSplashActive: boolean;
  loginSplashExiting: boolean;
  startLoginSplash: () => void;
  finishLoginSplash: () => Promise<void>;
  cancelLoginSplash: () => void;
}

export const applyInterfaceStyles = (glass: boolean, pulse: boolean, compact: boolean) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Glass effects
  if (!glass) {
    root.classList.add('disable-glass');
    root.setAttribute('data-glass', 'false');
    root.style.setProperty('--blur-glass', '0px');
  } else {
    root.classList.remove('disable-glass');
    root.removeAttribute('data-glass');
    root.style.removeProperty('--blur-glass');
  }

  // 2. Live sync pulse beacon
  if (!pulse) {
    root.classList.add('disable-pulse');
    root.setAttribute('data-pulse', 'false');
  } else {
    root.classList.remove('disable-pulse');
    root.removeAttribute('data-pulse');
  }

  // 3. Compact interface spacing density
  if (compact) {
    root.setAttribute('data-density', 'compact');
    root.classList.add('compact-density');
    root.style.setProperty('--density-padding', '0.5rem');
    root.style.setProperty('--density-scale', '0.94');
  } else {
    root.removeAttribute('data-density');
    root.classList.remove('compact-density');
    root.style.removeProperty('--density-padding');
    root.style.removeProperty('--density-scale');
  }
};

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
    let path = window.location.pathname;
    if (window.location.hash && window.location.hash.startsWith('#/')) {
      path = window.location.hash.substring(1); // e.g. "/step-verification"
    }
    const cleanPath = path.split('?')[0];
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
    return pathMap[cleanPath] || 'dashboard';
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
    get().commitAppearance();
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  setThemeMode: (mode: ThemeMode, persist = false) => {
    const isDark = mode === 'dark';
    set({ themeMode: mode, darkMode: isDark });
    if (persist) {
      get().commitAppearance();
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  glassEffects: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_glass_effects') !== 'false' : true,
  livePulse: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_live_pulse') !== 'false' : true,
  compactMode: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_compact_mode') === 'true' : false,

  savedAppearance: {
    themeMode: typeof localStorage !== 'undefined' && localStorage.getItem('themeMode') === 'dark' ? 'dark' : 'light',
    accentColor: (typeof localStorage !== 'undefined' ? localStorage.getItem('accentColor') || 'blue' : 'blue') as AccentColor,
    glassEffects: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_glass_effects') !== 'false' : true,
    livePulse: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_live_pulse') !== 'false' : true,
    compactMode: typeof localStorage !== 'undefined' ? localStorage.getItem('pms_compact_mode') === 'true' : false,
  },

  setGlassEffects: (enabled: boolean, persist = false) => {
    set({ glassEffects: enabled });
    applyInterfaceStyles(enabled, get().livePulse, get().compactMode);
    if (persist) {
      get().commitAppearance();
    }
  },

  setLivePulse: (enabled: boolean, persist = false) => {
    set({ livePulse: enabled });
    applyInterfaceStyles(get().glassEffects, enabled, get().compactMode);
    if (persist) {
      get().commitAppearance();
    }
  },

  setCompactMode: (enabled: boolean, persist = false) => {
    set({ compactMode: enabled });
    applyInterfaceStyles(get().glassEffects, get().livePulse, enabled);
    if (persist) {
      get().commitAppearance();
    }
  },

  setAccentColor: (color: AccentColor, persist = false) => {
    set({ accentColor: color });
    applyAccentStyles(color);
    if (persist) {
      get().commitAppearance();
    }
  },

  commitAppearance: () => {
    const { themeMode, darkMode, accentColor, glassEffects, livePulse, compactMode } = get();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('themeMode', themeMode);
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('accentColor', accentColor);
      localStorage.setItem('pms_glass_effects', String(glassEffects));
      localStorage.setItem('pms_live_pulse', String(livePulse));
      localStorage.setItem('pms_compact_mode', String(compactMode));
    }
    set({
      savedAppearance: {
        themeMode,
        accentColor,
        glassEffects,
        livePulse,
        compactMode,
      },
    });
  },

  discardAppearance: () => {
    const { savedAppearance } = get();
    const isDark = savedAppearance.themeMode === 'dark';

    set({
      themeMode: savedAppearance.themeMode,
      darkMode: isDark,
      accentColor: savedAppearance.accentColor,
      glassEffects: savedAppearance.glassEffects,
      livePulse: savedAppearance.livePulse,
      compactMode: savedAppearance.compactMode,
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('themeMode', savedAppearance.themeMode);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      localStorage.setItem('accentColor', savedAppearance.accentColor);
      localStorage.setItem('pms_glass_effects', String(savedAppearance.glassEffects));
      localStorage.setItem('pms_live_pulse', String(savedAppearance.livePulse));
      localStorage.setItem('pms_compact_mode', String(savedAppearance.compactMode));
    }

    if (typeof document !== 'undefined') {
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    applyAccentStyles(savedAppearance.accentColor);
    applyInterfaceStyles(savedAppearance.glassEffects, savedAppearance.livePulse, savedAppearance.compactMode);
  },

  setDashboardPrefs: (prefs: Partial<DashboardPrefs>) => {
    const updated = { ...get().dashboardPrefs, ...prefs };
    set({ dashboardPrefs: updated });
    localStorage.setItem('dashboardPrefs', JSON.stringify(updated));
  },

  initTheme: () => {
    const rawMode = localStorage.getItem('themeMode');
    const savedMode: ThemeMode = rawMode === 'dark' ? 'dark' : 'light';
    const savedAccent = (localStorage.getItem('accentColor') || 'blue') as AccentColor;
    const savedGlass = localStorage.getItem('pms_glass_effects') !== 'false';
    const savedPulse = localStorage.getItem('pms_live_pulse') !== 'false';
    const savedCompact = localStorage.getItem('pms_compact_mode') === 'true';
    const savedPrefs = localStorage.getItem('dashboardPrefs');

    const isDark = savedMode === 'dark';

    const snapshot: AppearanceSnapshot = {
      themeMode: savedMode,
      accentColor: savedAccent,
      glassEffects: savedGlass,
      livePulse: savedPulse,
      compactMode: savedCompact,
    };

    set({
      savedAppearance: snapshot,
      themeMode: savedMode,
      darkMode: isDark,
      accentColor: savedAccent,
      glassEffects: savedGlass,
      livePulse: savedPulse,
      compactMode: savedCompact,
      dashboardPrefs: savedPrefs ? JSON.parse(savedPrefs) : get().dashboardPrefs,
    });

    applyAccentStyles(savedAccent);
    applyInterfaceStyles(savedGlass, savedPulse, savedCompact);

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
  signOutModalOpen: false,
  setSignOutModalOpen: (isOpen) => set({ signOutModalOpen: isOpen }),
  loginSplashActive: false,
  loginSplashExiting: false,
  startLoginSplash: () => set({ loginSplashActive: true, loginSplashExiting: false }),
  finishLoginSplash: async () => {
    set({ loginSplashExiting: true });
    await new Promise((r) => setTimeout(r, 450));
    set({ loginSplashActive: false, loginSplashExiting: false });
  },
  cancelLoginSplash: () => set({ loginSplashActive: false, loginSplashExiting: false }),
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
