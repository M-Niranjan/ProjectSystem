import { getAvatarByName } from '../services/avatar';
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
  Settings,
  UserCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Award,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';

interface SidebarItem {
  name: string;
  view: string;
  icon: React.ComponentType<any>;
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
};

const getDashboardPath = (role?: string | null) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin')) return '/admin/dashboard';
  if (r.includes('manager') || r.includes('lead')) return '/team-lead/dashboard';
  return '/employee/dashboard';
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { sidebarExpanded, toggleSidebar, activeView, setView } = useUIStore();
  const { logout, user } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adminMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'Users Directory', view: 'users', icon: Users },
    { name: 'Roles & Permissions', view: 'roles', icon: Shield },
    { name: 'Teams Overview', view: 'teams', icon: FolderGit2 },
    { name: 'Organization', view: 'organization', icon: Sparkles },
    { name: 'Audit Logs', view: 'audit-logs', icon: FileText },
    { name: 'Settings', view: 'settings', icon: Settings },
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
    { name: 'Settings', view: 'settings', icon: Settings },
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
    { name: 'Settings', view: 'settings', icon: Settings },
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
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 transition-opacity duration-200"
        />
      )}

      <motion.aside
        animate={
          isMobile
            ? { x: sidebarExpanded ? 0 : -250, width: 250 }
            : { x: 0, width: sidebarExpanded ? 240 : 70 }
        }
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 bottom-0 left-0 flex flex-col justify-between py-4 glass-panel rounded-none border-t-0 border-l-0 border-b-0 print:hidden ${
          isMobile ? 'z-40 h-full' : 'z-30 h-screen'
        }`}
      >
        {/* Brand Header */}
        <div>
          {showExpanded ? (
            <div className="flex items-center justify-between px-4 mb-6">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col leading-tight select-none"
                >
                  <span className="font-bold text-xs tracking-tight text-slate-900 dark:text-zinc-100">
                    Project System
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Workspace
                  </span>
                </motion.div>
              </div>

              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  title="Collapse Sidebar"
                  className="w-6 h-6 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-center mb-6 px-2">
              <button
                onClick={toggleSidebar}
                title="Expand Sidebar"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 transition-colors"
              >
                <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
              </button>
            </div>
          )}

          {/* Menu Navigation Items */}
          <nav className="px-2 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {allowedItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    setView(item.view);
                    const targetPath = item.view === 'dashboard'
                      ? getDashboardPath(user?.role)
                      : (VIEW_TO_PATH[item.view] || getDashboardPath(user?.role));
                    navigate(targetPath);
                    if (isMobile) toggleSidebar();
                  }}
                  className={`w-full flex items-center ${
                    showExpanded ? 'gap-3 px-3 py-2 justify-start' : 'justify-center py-2'
                  } rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer group relative ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`} />

                  {showExpanded && (
                    <span className="truncate">
                      {item.name}
                    </span>
                  )}

                  {!showExpanded && !isMobile && (
                    <div className="absolute left-14 px-2.5 py-1 bg-zinc-900 text-zinc-100 text-xs font-medium rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Profile & Logout */}
        <div className="px-2 space-y-1.5">
          {user && (
            showExpanded ? (
              <div className="p-2 bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center gap-2.5 overflow-hidden">
                <img
                  src={user.profilePhoto || getAvatarByName(user.name)}
                  alt="avatar"
                  className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                />
                <div className="truncate">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono truncate">{user.role.replace('ROLE_', '')}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center group relative">
                <img
                  src={user.profilePhoto || getAvatarByName(user.name)}
                  alt="avatar"
                  className="w-8 h-8 rounded-lg object-cover cursor-pointer"
                  title={user.name}
                />
                <div className="absolute left-14 px-2.5 py-1 bg-zinc-900 text-zinc-100 text-xs rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                  {user.name} ({user.role.replace('ROLE_', '')})
                </div>
              </div>
            )
          )}
          
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`w-full flex items-center ${
              showExpanded ? 'gap-3 px-3 py-1.5 justify-start' : 'justify-center py-1.5'
            } rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors cursor-pointer group relative`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {showExpanded && (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
