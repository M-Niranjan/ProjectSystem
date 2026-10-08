import { getAvatarByName, resolveAvatar } from '../services/avatar';
import { formatRoleName, getDashboardPathForRole, normalizeRole } from '../services/authRoles';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderGit2,
  CheckSquare,
  Kanban,
  Calendar,
  Clock,
  Users,
  FileText,
  MessageSquare,
  BarChart3,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  ShieldCheck,
  Award,
  Activity,
  KeyRound,
  Building2,
  Network,
  ScrollText,
  Settings as SettingsIcon,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useScrollLock } from '../hooks/useScrollLock';

interface SidebarItem {
  name: string;
  view: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
}

const ITEM_GLOW_COLORS: Record<string, { icon: string; activeBg: string; activeBorder: string; activeGlow: string }> = {
  dashboard: {
    icon: 'text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.45)]',
    activeBg: 'from-cyan-500/15 via-blue-500/10 to-transparent',
    activeBorder: 'border-cyan-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
  },
  'step-verification': {
    icon: 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]',
    activeBg: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    activeBorder: 'border-emerald-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
  },
  'team-tracking': {
    icon: 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]',
    activeBg: 'from-amber-500/15 via-orange-500/10 to-transparent',
    activeBorder: 'border-amber-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
  },
  projects: {
    icon: 'text-blue-500 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]',
    activeBg: 'from-blue-500/15 via-indigo-500/10 to-transparent',
    activeBorder: 'border-blue-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
  'my-projects': {
    icon: 'text-blue-500 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]',
    activeBg: 'from-blue-500/15 via-indigo-500/10 to-transparent',
    activeBorder: 'border-blue-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
  tasks: {
    icon: 'text-violet-500 dark:text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.45)]',
    activeBg: 'from-violet-500/15 via-purple-500/10 to-transparent',
    activeBorder: 'border-violet-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(139,92,246,0.25)]',
  },
  'my-tasks': {
    icon: 'text-violet-500 dark:text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.45)]',
    activeBg: 'from-violet-500/15 via-purple-500/10 to-transparent',
    activeBorder: 'border-violet-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(139,92,246,0.25)]',
  },
  teams: {
    icon: 'text-sky-500 dark:text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]',
    activeBg: 'from-sky-500/15 via-cyan-500/10 to-transparent',
    activeBorder: 'border-sky-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(56,189,248,0.25)]',
  },
  users: {
    icon: 'text-rose-500 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]',
    activeBg: 'from-rose-500/15 via-pink-500/10 to-transparent',
    activeBorder: 'border-rose-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.25)]',
  },
  messages: {
    icon: 'text-pink-500 dark:text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.45)]',
    activeBg: 'from-pink-500/15 via-purple-500/10 to-transparent',
    activeBorder: 'border-pink-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(236,72,153,0.25)]',
  },
  reviews: {
    icon: 'text-amber-500 dark:text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.45)]',
    activeBg: 'from-yellow-500/15 via-amber-500/10 to-transparent',
    activeBorder: 'border-yellow-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(234,179,8,0.25)]',
  },
  'time-tracking': {
    icon: 'text-teal-500 dark:text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.45)]',
    activeBg: 'from-teal-500/15 via-cyan-500/10 to-transparent',
    activeBorder: 'border-teal-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(20,184,166,0.25)]',
  },
  calendar: {
    icon: 'text-purple-500 dark:text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.45)]',
    activeBg: 'from-purple-500/15 via-indigo-500/10 to-transparent',
    activeBorder: 'border-purple-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]',
  },
  documents: {
    icon: 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]',
    activeBg: 'from-emerald-500/15 via-green-500/10 to-transparent',
    activeBorder: 'border-emerald-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
  },
  reports: {
    icon: 'text-fuchsia-500 dark:text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]',
    activeBg: 'from-fuchsia-500/15 via-rose-500/10 to-transparent',
    activeBorder: 'border-fuchsia-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(217,70,239,0.25)]',
  },
  'workspace-activity': {
    icon: 'text-cyan-500 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.45)]',
    activeBg: 'from-cyan-500/15 via-blue-500/10 to-transparent',
    activeBorder: 'border-cyan-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
  },
  settings: {
    icon: 'text-indigo-500 dark:text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.45)]',
    activeBg: 'from-indigo-500/15 via-blue-500/10 to-transparent',
    activeBorder: 'border-indigo-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]',
  },
  organization: {
    icon: 'text-blue-500 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.45)]',
    activeBg: 'from-blue-500/15 via-cyan-500/10 to-transparent',
    activeBorder: 'border-blue-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
  roles: {
    icon: 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]',
    activeBg: 'from-amber-500/15 via-orange-500/10 to-transparent',
    activeBorder: 'border-amber-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]',
  },
  performance: {
    icon: 'text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.45)]',
    activeBg: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    activeBorder: 'border-emerald-500/35',
    activeGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
  },
};

const VIEW_TO_PATH: Record<string, string> = {
  dashboard: '/dashboard',
  'step-verification': '/step-verification',
  'team-tracking': '/team-tracking',
  'work-profile': '/team-tracking',
  projects: '/projects',
  'my-projects': '/my-projects',
  tasks: '/tasks',
  'my-tasks': '/my-tasks',
  boards: '/boards',
  calendar: '/calendar',
  timeline: '/timeline',
  'time-tracking': '/time-tracking',
  teams: '/teams',
  messages: '/messages',
  reports: '/reports',
  settings: '/settings',
  profile: '/profile',
  documents: '/documents',
  users: '/users',
  roles: '/roles',
  organization: '/organization',
  'audit-logs': '/audit-logs',
  reviews: '/reviews',
  performance: '/performance',
  'workspace-activity': '/workspace-activity',
};

const getDashboardPath = (role?: string | null) => {
  const normalized = normalizeRole(role);
  if (!normalized) return '/dashboard';
  return getDashboardPathForRole(normalized) || '/dashboard';
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { sidebarExpanded, toggleSidebar, activeView, setView } = useUIStore();
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  useEffect(() => {
    const checkScreen = () => {
      const mobileOrTablet = window.innerWidth < 1024;
      setIsMobileOrTablet(mobileOrTablet);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Lock background dashboard scroll when mobile/tablet sidebar drawer is open to keep background 100% constant
  useScrollLock(isMobileOrTablet && sidebarExpanded);

  const adminMenuItems: SidebarItem[] = [
    // Dashboard section
    { name: 'Overview', view: 'dashboard', icon: LayoutDashboard, section: 'Dashboard' },
    { name: 'Analytics', view: 'reports', icon: BarChart3 },

    // Projects & Tasks section
    { name: 'Projects', view: 'projects', icon: FolderGit2, section: 'Projects & Tasks' },
    { name: 'Tasks', view: 'tasks', icon: CheckSquare },

    // Team section
    { name: 'Team Leaders', view: 'teams', icon: Users, section: 'Team' },
    { name: 'Employees', view: 'users', icon: Network },
    { name: 'Chat', view: 'messages', icon: MessageSquare },

    // Organization section
    { name: 'Organization', view: 'organization', icon: Building2, section: 'Organization' },
    { name: 'Documents', view: 'documents', icon: FileText },
    { name: 'Activity', view: 'workspace-activity', icon: Clock },

    // Settings section
    { name: 'Roles & Permissions', view: 'roles', icon: KeyRound, section: 'Settings' },
    { name: 'Security & Settings', view: 'settings', icon: Shield },
  ];

  const teamLeadMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'Step Verification', view: 'step-verification', icon: ShieldCheck },
    { name: 'Work Tracking', view: 'team-tracking', icon: Activity },
    { name: 'Projects', view: 'projects', icon: FolderGit2 },
    { name: 'Tasks', view: 'tasks', icon: CheckSquare },
    { name: 'Teams', view: 'teams', icon: Users },
    { name: 'Employees', view: 'users', icon: Network },
    { name: 'Chat', view: 'messages', icon: MessageSquare },
    { name: 'Task Reviews', view: 'reviews', icon: Award },
    { name: 'Time Tracking', view: 'time-tracking', icon: Clock },
    { name: 'Calendar', view: 'calendar', icon: Calendar },
    { name: 'Documents', view: 'documents', icon: FileText },
    { name: 'Reports', view: 'reports', icon: BarChart3 },
    { name: 'Workspace Activity', view: 'workspace-activity', icon: Clock },
    { name: 'Settings', view: 'settings', icon: SettingsIcon },
  ];

  const employeeMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', view: 'my-tasks', icon: CheckSquare },
    { name: 'My Projects', view: 'my-projects', icon: FolderGit2 },
    { name: 'Employees', view: 'users', icon: Network },
    { name: 'Chat', view: 'messages', icon: MessageSquare },
    { name: 'My Performance', view: 'performance', icon: BarChart3 },
    { name: 'Time Tracking', view: 'time-tracking', icon: Clock },
    { name: 'Calendar', view: 'calendar', icon: Calendar },
    { name: 'Documents', view: 'documents', icon: FileText },
    { name: 'Workspace Activity', view: 'workspace-activity', icon: Clock },
    { name: 'Settings', view: 'settings', icon: SettingsIcon },
  ];

  const allowedItems = user?.role === 'ROLE_ADMIN'
    ? adminMenuItems
    : (user?.role === 'ROLE_MANAGER' || (user?.role as string) === 'ROLE_TEAM_LEAD')
    ? teamLeadMenuItems
    : employeeMenuItems;

  const isExpandedOrDrawer = sidebarExpanded;

  return (
    <>
      {isMobileOrTablet && sidebarExpanded && (
        <div 
          onClick={toggleSidebar} 
          onTouchMove={(e) => {
            if (e.cancelable) e.preventDefault();
          }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-200 touch-none overscroll-none select-none"
        />
      )}

      <motion.aside
        animate={
          isMobileOrTablet
            ? { x: sidebarExpanded ? 0 : -290, width: 280 }
            : { x: 0, width: sidebarExpanded ? 270 : 76 }
        }
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target?.closest('.sidebar-scrollable-nav')) {
            if (e.cancelable) e.preventDefault();
          }
        }}
        className={`fixed top-0 bottom-0 left-0 flex flex-col justify-between pt-3.5 glass-panel rounded-none border-t-0 border-l-0 border-b-0 print:hidden overscroll-contain select-none h-[100dvh] max-h-[100dvh] overflow-hidden backdrop-blur-2xl bg-white/95 dark:bg-[#070913]/95 border-r border-slate-200/80 dark:border-white/[0.08] shadow-2xl ${
          isMobileOrTablet ? 'z-50' : 'z-30'
        }`}
      >
        {/* Brand Header */}
        <div className="shrink-0 px-4 pt-1 mb-3">
          {isExpandedOrDrawer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-indigo-500/30 p-1 shadow-[0_0_12px_rgba(99,102,241,0.25)]">
                  <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col leading-tight select-none"
                >
                  <span className="font-bold text-[15px] tracking-tight text-slate-900 dark:text-zinc-100">
                    Project System
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                    Workspace
                  </span>
                </motion.div>
              </div>

              {isMobileOrTablet ? (
                <button
                  onClick={toggleSidebar}
                  title="Close Menu"
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={toggleSidebar}
                  title="Collapse Sidebar"
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center px-1">
              <button
                onClick={toggleSidebar}
                title="Expand Sidebar"
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-sm hover:scale-105 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Menu Navigation Items - Flexibly scrollable without visible scrollbars */}
        <nav 
          tabIndex={-1}
          className="sidebar-scrollable-nav no-scrollbar hide-scrollbar flex-1 min-h-0 px-3 space-y-1 overflow-y-auto overflow-x-hidden overscroll-contain outline-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const targetPath = item.view === 'dashboard'
              ? getDashboardPath(user?.role)
              : (VIEW_TO_PATH[item.view] || getDashboardPath(user?.role));
            const isActive = item.view === 'dashboard'
              ? (location.pathname === '/admin/dashboard' || 
                 location.pathname === '/team-lead/dashboard' || 
                 location.pathname === '/employee/dashboard' || 
                 location.pathname === '/dashboard' || 
                 location.pathname === '/')
              : (location.pathname === targetPath || location.pathname.startsWith(targetPath + '/'));

            const glowConfig = ITEM_GLOW_COLORS[item.view] || {
              icon: 'text-indigo-400 dark:text-indigo-400 drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]',
              activeBg: 'from-indigo-500/15 via-blue-500/10 to-transparent',
              activeBorder: 'border-indigo-500/35',
              activeGlow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]',
            };

            return (
              <React.Fragment key={`${item.name}-${item.view}`}>
                {isExpandedOrDrawer && item.section && (
                  <div className="pt-3 pb-1 px-3 text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500 select-none">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (location.pathname !== targetPath) {
                      navigate(targetPath);
                    }
                    if (isMobileOrTablet) toggleSidebar();
                  }}
                  className={`w-full flex items-center ${
                    isExpandedOrDrawer ? 'gap-3 px-3 py-2 justify-start' : 'justify-center py-2'
                  } rounded-xl text-[13.5px] font-semibold border transition-all duration-200 ease-out cursor-pointer group relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-r ${glowConfig.activeBg} bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white ${glowConfig.activeBorder} ${glowConfig.activeGlow}`
                      : 'border-transparent text-slate-600 dark:text-zinc-300 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {/* Subtle active left illuminated pill indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-cyan-400 via-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}

                  <div className="flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                    <Icon className={`w-4.5 h-4.5 transition-all duration-200 ${glowConfig.icon}`} />
                  </div>

                  {isExpandedOrDrawer && (
                    <span className="truncate tracking-tight font-medium">
                      {item.name}
                    </span>
                  )}

                  {!isExpandedOrDrawer && !isMobileOrTablet && (
                    <div className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-zinc-100 text-xs font-medium rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Footer: User Profile - Non-clickable info badge */}
        <div className="shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
          {user && (
            isExpandedOrDrawer ? (
              <div
                className="w-full p-2 rounded-xl flex items-center gap-3 overflow-hidden border border-transparent bg-slate-50 dark:bg-white/5 select-none cursor-default"
              >
                <img
                  src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                  alt="avatar"
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10"
                />
                <div className="truncate flex-1">
                  <p className="text-[13.5px] font-bold truncate text-slate-900 dark:text-zinc-100">{user.name}</p>
                  <p className="text-[10.5px] uppercase tracking-wider font-mono truncate font-semibold text-slate-500 dark:text-zinc-400">{formatRoleName(user.role)}</p>
                </div>
              </div>
            ) : (
              <div
                className="w-full flex justify-center group relative select-none cursor-default"
                title={`${user.name} (${formatRoleName(user.role, 'title')})`}
              >
                <img
                  src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                  alt="avatar"
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10"
                />
                <div className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-zinc-100 text-xs rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                  {user.name} ({formatRoleName(user.role, 'title')})
                </div>
              </div>
            )
          )}
        </div>
      </motion.aside>
    </>
  );
}

