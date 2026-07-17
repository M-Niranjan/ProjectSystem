import { create } from 'zustand';

interface UIState {
  sidebarExpanded: boolean;
  darkMode: boolean;
  activeLanguage: string;
  voiceOverlayOpen: boolean;
  pomodoroTimerOpen: boolean;
  activeView: string; // 'dashboard', 'projects', 'tasks', 'boards', 'calendar', 'timeline', 'teams', 'messages', 'reports', 'settings', 'profile'
  selectedProjectId: number | null;
  projectModalOpen: boolean;
  taskModalOpen: boolean;
  preselectedStatus: string | null;
  isTaskEditMode: boolean;
  editingTask: any | null;
  chatContactId: number | null;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  initTheme: () => void;
  setLanguage: (lang: string) => void;
  setVoiceOverlay: (isOpen: boolean) => void;
  setPomodoroTimer: (isOpen: boolean) => void;
  setView: (view: string, projectId?: number | null) => void;
  setProjectModalOpen: (isOpen: boolean) => void;
  setTaskModalOpen: (isOpen: boolean, status?: string | null, isEdit?: boolean, task?: any | null) => void;
  setChatContactId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarExpanded: true,
  darkMode: false,
  activeLanguage: 'EN',
  voiceOverlayOpen: false,
  pomodoroTimerOpen: false,
  activeView: 'dashboard',
  selectedProjectId: null,
  projectModalOpen: false,
  taskModalOpen: false,
  preselectedStatus: null,
  isTaskEditMode: false,
  editingTask: null,
  chatContactId: null,

  toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),

  toggleTheme: () => {
    const nextDark = !get().darkMode;
    set({ darkMode: nextDark });
    localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  initTheme: () => {
    const saved = localStorage.getItem('theme');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved === 'dark' || (!saved && system);
    set({ darkMode: isDark });
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

  setChatContactId: (id) => set({ chatContactId: id })
}));
