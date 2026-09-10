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
    if (confirm('Are you sure you want to log out of Project Management System?')) {
      logout();
    }
  };

  const showExpanded = isMobile || sidebarExpanded;

  return (
    <>
      {isMobile && sidebarExpanded && (
        <div 
          onClick={toggleSidebar} 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 transition-opacity duration-300"
        />
      )}

      <motion.aside
        animate={
          isMobile
            ? { x: sidebarExpanded ? 0 : -255, width: 255 }
            : { x: 0, width: sidebarExpanded ? 255 : 76 }
        }
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed top-0 bottom-0 left-0 flex flex-col justify-between py-5 glass-panel rounded-none border-t-0 border-l-0 border-b-0 print:hidden ${
          isMobile ? 'z-40 h-full' : 'z-30 h-screen'
        }`}
      >
        {/* Brand Header */}
        <div>
          {showExpanded ? (
            /* Expanded Header: Purple 3D Logo + Title + Collapse Chevron */
            <div className="flex items-center justify-between px-3.5 mb-6">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center w-11 h-11 bg-transparent p-0 overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300">
                  <img src="/logo.png" alt="Project Management System Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col leading-tight select-none"
                >
                  <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white uppercase">
                    PROJECT MANAGEMENT
                  </span>
                  <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400 tracking-widest">
                    SYSTEM HUB
                  </span>
                </motion.div>
              </div>

              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  title="Collapse Sidebar"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200/50 dark:border-white/10 hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* Collapsed Header: Centered Interactive Purple 3D Logo / Expand Button */
            <div className="flex justify-center mb-6 px-2">
              <button
                onClick={toggleSidebar}
                title="Expand Sidebar"
                className="group relative flex items-center justify-center w-11 h-11 bg-transparent p-0 hover:scale-110 cursor-pointer transition-transform duration-300 overflow-hidden"
              >
                <img src="/logo.png" alt="Project Management System Logo" className="w-full h-full object-contain filter drop-shadow-lg transition-all duration-300 group-hover:scale-0 group-hover:opacity-0" />
                <ChevronRight className="w-5 h-5 text-purple-600 dark:text-purple-400 absolute transition-all duration-300 scale-0 opacity-0 group-hover:scale-110 group-hover:opacity-100" />
              </button>
            </div>
          )}

          {/* Menu Navigation Items */}
          <nav className="px-3 space-y-1.5 max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
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
                  } rounded-xl font-bold text-xs transition-all duration-300 cursor-pointer group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-blue-500/25 border border-white/20 scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {/* Comfortable HD Icon Container Badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-xs border border-white/30 scale-105'
                      : 'bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-slate-400 group-hover:border-blue-500/40 group-hover:bg-blue-500/10 group-hover:text-blue-500 group-hover:scale-105'
                  }`}>
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400'}`} />
                  </div>

                  {/* Menu Item Label (Expanded mode) */}
                  {showExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="truncate tracking-tight font-black"
                    >
                      {item.name}
                    </motion.span>
                  )}

                  {/* Floating HD Tooltip Label (Collapsed mode) */}
                  {!showExpanded && !isMobile && (
                    <div className="absolute left-15 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-black rounded-xl shadow-2xl border border-white/15 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0">
                      {item.name}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Profile & Logout */}
        <div className="px-3 space-y-2">
          {user && (
            showExpanded ? (
              /* Expanded User Card */
              <div className="mx-0.5 p-2.5 bg-white/30 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl flex items-center gap-2.5 overflow-hidden shadow-xs hover:border-blue-500/30 transition-all">
                <img
                  src={user.profilePhoto || getAvatarByName(user.name)}
                  alt="avatar"
                  className="w-8 h-8 rounded-lg object-cover ring-2 ring-blue-500/30 flex-shrink-0 shadow-xs"
                />
                <div className="truncate">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">{user.name}</p>
                  <p className="text-[9.5px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider truncate">{user.role.replace('ROLE_', '')}</p>
                </div>
              </div>
            ) : (
              /* Collapsed User Avatar Badge */
              <div className="flex justify-center group relative">
                <img
                  src={user.profilePhoto || getAvatarByName(user.name)}
                  alt="avatar"
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500/40 shadow-xs cursor-pointer group-hover:scale-105 transition-all"
                  title={user.name}
                />
                <div className="absolute left-15 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-black rounded-xl shadow-2xl border border-white/15 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
                  {user.name} ({user.role.replace('ROLE_', '')})
                </div>
              </div>
            )
          )}
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Sign Out Hub"
            className={`w-full flex items-center ${
              showExpanded ? 'gap-3 px-2.5 py-2 justify-start' : 'justify-center py-2'
            } rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold text-xs transition-all cursor-pointer group relative`}
          >
            <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-rose-500/10 border border-rose-500/20 text-rose-500 group-hover:scale-105 flex-shrink-0">
              <LogOut className="w-4 h-4 text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
            </div>

            {showExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-black"
              >
                Sign Out Hub
              </motion.span>
            )}

            {!showExpanded && !isMobile && (
              <div className="absolute left-15 px-3 py-1.5 bg-rose-900/95 text-white text-xs font-black rounded-xl shadow-2xl border border-rose-500/30 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50">
                Sign Out Hub
              </div>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
