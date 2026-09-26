import { getAvatarByName, resolveAvatar } from '../services/avatar';
import { formatRoleName } from '../services/authRoles';
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
  User,
  LogOut,
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
  Settings2,
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
}

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
  const r = String(role || '').toLowerCase();
  if (r.includes('admin')) return '/admin/dashboard';
  if (r.includes('manager') || r.includes('lead')) return '/team-lead/dashboard';
  return '/employee/dashboard';
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarExpanded, toggleSidebar, activeView, setView } = useUIStore();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock background dashboard scroll when mobile sidebar drawer is open to keep background 100% constant
  useScrollLock(isMobile && sidebarExpanded);

  const adminMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'User Directory', view: 'users', icon: Users },
    { name: 'Roles & Permissions', view: 'roles', icon: KeyRound },
    { name: 'Org Settings', view: 'organization', icon: Building2 },
    { name: 'Team Config', view: 'teams', icon: Network },
    { name: 'Task Reviews', view: 'reviews', icon: Award },
    { name: 'Audit Logs', view: 'audit-logs', icon: ScrollText },
    { name: 'Workspace Activity', view: 'workspace-activity', icon: Clock },
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: Settings2 },
  ];

  const teamLeadMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'Step Verification', view: 'step-verification', icon: ShieldCheck },
    { name: 'Work Tracking', view: 'team-tracking', icon: Activity },
    { name: 'Projects', view: 'projects', icon: FolderGit2 },
    { name: 'Tasks', view: 'tasks', icon: CheckSquare },
    { name: 'Teams', view: 'teams', icon: Users },
    { name: 'Task Reviews', view: 'reviews', icon: Award },
    { name: 'Time Tracking', view: 'time-tracking', icon: Clock },
    { name: 'Calendar', view: 'calendar', icon: Calendar },
    { name: 'Communication', view: 'messages', icon: MessageSquare },
    { name: 'Documents', view: 'documents', icon: FileText },
    { name: 'Reports', view: 'reports', icon: BarChart3 },
    { name: 'Workspace Activity', view: 'workspace-activity', icon: Clock },
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: Settings2 },
  ];

  const employeeMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', view: 'my-tasks', icon: CheckSquare },
    { name: 'My Projects', view: 'my-projects', icon: FolderGit2 },
    { name: 'My Performance', view: 'performance', icon: BarChart3 },
    { name: 'Time Tracking', view: 'time-tracking', icon: Clock },
    { name: 'Calendar', view: 'calendar', icon: Calendar },
    { name: 'Communication', view: 'messages', icon: MessageSquare },
    { name: 'Documents', view: 'documents', icon: FileText },
    { name: 'Workspace Activity', view: 'workspace-activity', icon: Clock },
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: Settings2 },
  ];

  const allowedItems = user?.role === 'ROLE_ADMIN'
    ? adminMenuItems
    : (user?.role === 'ROLE_MANAGER' || (user?.role as string) === 'ROLE_TEAM_LEAD')
    ? teamLeadMenuItems
    : employeeMenuItems;

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  const showExpanded = isMobile || sidebarExpanded;

  return (
    <>
      {isMobile && sidebarExpanded && (
        <div 
          onClick={toggleSidebar} 
          onTouchMove={(e) => {
            if (e.cancelable) e.preventDefault();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-200 touch-none overscroll-none select-none"
        />
      )}

      <motion.aside
        animate={
          isMobile
            ? { x: sidebarExpanded ? 0 : -280, width: 280 }
            : { x: 0, width: sidebarExpanded ? 270 : 76 }
        }
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          const target = e.target as HTMLElement | null;
          if (!target?.closest('.sidebar-scrollable-nav')) {
            if (e.cancelable) e.preventDefault();
          }
        }}
        className={`fixed top-0 bottom-0 left-0 flex flex-col justify-between pt-3.5 glass-panel rounded-none border-t-0 border-l-0 border-b-0 print:hidden overscroll-contain select-none h-[100dvh] max-h-[100dvh] ${
          isMobile ? 'z-50' : 'z-30'
        }`}
      >
        {/* Brand Header */}
        <div className="shrink-0 px-4 pt-1 mb-3">
          {showExpanded ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                  <img src="/logo.png" alt="Logo" className="w-5.5 h-5.5 object-contain" />
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

              {isMobile ? (
                <button
                  onClick={toggleSidebar}
                  title="Close Menu"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
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
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 transition-colors cursor-pointer"
              >
                <img src="/logo.png" alt="Logo" className="w-5.5 h-5.5 object-contain" />
              </button>
            </div>
          )}
        </div>

        {/* Menu Navigation Items - Flexibly scrollable in the middle */}
        <nav className="sidebar-scrollable-nav flex-1 min-h-0 px-3 space-y-1.5 overflow-y-auto overscroll-contain scrollbar-thin">
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

            return (
              <button
                key={item.view}
                onClick={() => {
                  if (location.pathname !== targetPath) {
                    navigate(targetPath);
                  }
                  if (isMobile) toggleSidebar();
                }}
                className={`w-full flex items-center ${
                  showExpanded ? 'gap-3 px-3 py-2 justify-start' : 'justify-center py-2'
                } rounded-xl text-[14px] font-semibold border transition-all duration-200 ease-out cursor-pointer group relative ${
                  isActive
                    ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200/80 dark:border-white/15 shadow-sm dark:shadow-black/30'
                    : 'border-transparent text-slate-600 dark:text-zinc-400 hover:bg-slate-100/70 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />

                {showExpanded && (
                  <span className="truncate tracking-normal">
                    {item.name}
                  </span>
                )}

                {!showExpanded && !isMobile && (
                  <div className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-zinc-100 text-xs font-medium rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: User Profile & Logout - Strictly pinned and always visible above safe-area */}
        <div className="shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
          {user && (
            showExpanded ? (
              <button
                type="button"
                onClick={() => {
                  if (location.pathname !== '/profile') {
                    navigate('/profile');
                  }
                  if (isMobile) toggleSidebar();
                }}
                className={`w-full p-2 rounded-xl flex items-center gap-3 overflow-hidden border transition-all duration-200 ease-out text-left cursor-pointer group ${
                  location.pathname === '/profile'
                    ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border-slate-200/80 dark:border-white/15 shadow-sm dark:shadow-black/30'
                    : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100/70 dark:hover:bg-white/10'
                }`}
                title="View My Profile"
              >
                <img
                  src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                  alt="avatar"
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200 dark:ring-white/10 group-hover:scale-105 transition-transform"
                />
                <div className="truncate flex-1">
                  <p className={`text-[13.5px] font-bold truncate ${location.pathname === '/profile' ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-zinc-100'}`}>{user.name}</p>
                  <p className="text-[10.5px] uppercase tracking-wider font-mono truncate font-semibold text-slate-500 dark:text-zinc-400">{formatRoleName(user.role)}</p>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setView('profile');
                  if (isMobile) toggleSidebar();
                }}
                className="w-full flex justify-center group relative cursor-pointer"
                title={`View Profile: ${user.name}`}
              >
                <img
                  src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                  alt="avatar"
                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/10 hover:ring-2 hover:ring-cyan-500 transition-all"
                />
                <div className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-zinc-100 text-xs rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                  {user.name} ({formatRoleName(user.role, 'title')})
                </div>
              </button>
            )
          )}
          
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`w-full flex items-center ${
              showExpanded ? 'gap-2.5 px-3 py-2 justify-start' : 'justify-center py-2'
            } rounded-xl text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-[13px] font-bold transition-all cursor-pointer group relative shadow-xs`}
          >
            <LogOut className="w-4 h-4 text-rose-500 flex-shrink-0" />
            {showExpanded && (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
