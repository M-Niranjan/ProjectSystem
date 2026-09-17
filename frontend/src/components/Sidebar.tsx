import { getAvatarByName, resolveAvatar } from '../services/avatar';
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
  Award,
  Activity,
  ShieldCheck,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';

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
};

const getDashboardPath = (role?: string | null) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin')) return '/admin/dashboard';
  if (r.includes('manager') || r.includes('lead')) return '/team-lead/dashboard';
  return '/employee/dashboard';
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarExpanded, toggleSidebar, activeView, setView } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const UserDirNavIcon = ({ className }: { className?: string }) => (
    <img src="/user-directory-icon.png" alt="Users Directory" className={`${className || 'w-5 h-5'} object-contain`} />
  );
  const RolesNavIcon = ({ className }: { className?: string }) => (
    <img src="/roles-perms-icon.png" alt="Roles & Permissions" className={`${className || 'w-5 h-5'} object-contain`} />
  );
  const OrgNavIcon = ({ className }: { className?: string }) => (
    <img src="/org-settings-icon.png" alt="Org Settings" className={`${className || 'w-5 h-5'} object-contain`} />
  );
  const TeamsNavIcon = ({ className }: { className?: string }) => (
    <img src="/team-config-icon.png" alt="Team Config" className={`${className || 'w-5 h-5'} object-contain`} />
  );
  const AuditNavIcon = ({ className }: { className?: string }) => (
    <img src="/audit-icon.png" alt="Audit" className={`${className || 'w-5 h-5'} object-contain`} />
  );
  const SettingsNavIcon = ({ className }: { className?: string }) => (
    <img src="/settings-icon.png" alt="Settings" className={`${className || 'w-5 h-5'} object-contain`} />
  );

  const adminMenuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'User Directory', view: 'users', icon: UserDirNavIcon },
    { name: 'Roles & Permissions', view: 'roles', icon: RolesNavIcon },
    { name: 'Org Settings', view: 'organization', icon: OrgNavIcon },
    { name: 'Team Config', view: 'teams', icon: TeamsNavIcon },
    { name: 'Task Reviews', view: 'reviews', icon: Award },
    { name: 'Audit Logs', view: 'audit-logs', icon: AuditNavIcon },
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: SettingsNavIcon },
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
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: SettingsNavIcon },
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
    { name: 'Profile', view: 'profile', icon: User },
    { name: 'Settings', view: 'settings', icon: SettingsNavIcon },
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
            ? { x: sidebarExpanded ? 0 : -270, width: 270 }
            : { x: 0, width: sidebarExpanded ? 270 : 76 }
        }
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 bottom-0 left-0 flex flex-col justify-between py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] glass-panel rounded-none border-t-0 border-l-0 border-b-0 print:hidden ${
          isMobile ? 'z-50 h-full' : 'z-30 h-screen'
        }`}
      >
        {/* Brand Header */}
        <div>
          {showExpanded ? (
            <div className="flex items-center justify-between px-4 mb-7">
              <div className="flex items-center gap-3.5 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                  <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col leading-tight select-none"
                >
                  <span className="font-bold text-[16px] tracking-tight text-slate-900 dark:text-zinc-100">
                    Project System
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
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
            <div className="flex justify-center mb-7 px-2">
              <button
                onClick={toggleSidebar}
                title="Expand Sidebar"
                className="w-11 h-11 flex items-center justify-center rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 transition-colors cursor-pointer"
              >
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
              </button>
            </div>
          )}

          {/* Menu Navigation Items */}
          <nav className="px-3 space-y-2 max-h-[calc(100vh-230px)] overflow-y-auto">
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
                    showExpanded ? 'gap-3.5 px-3.5 py-2.5 justify-start' : 'justify-center py-2.5'
                  } rounded-xl text-[15px] font-medium transition-all duration-150 cursor-pointer group relative ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'}`} />

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
        </div>

        {/* Footer: User Profile & Logout */}
        <div className="px-3 space-y-2">
          {user && (
            showExpanded ? (
              <button
                type="button"
                onClick={() => {
                  setView('profile');
                  if (isMobile) toggleSidebar();
                }}
                className={`w-full p-2.5 rounded-xl flex items-center gap-3.5 overflow-hidden transition-all text-left cursor-pointer group ${
                  activeView === 'profile'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800'
                }`}
                title="View My Profile"
              >
                <img
                  src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                  alt="avatar"
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-zinc-300 dark:ring-zinc-700 group-hover:scale-105 transition-transform"
                />
                <div className="truncate flex-1">
                  <p className={`text-[14px] font-semibold truncate ${activeView === 'profile' ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{user.name}</p>
                  <p className={`text-[11px] uppercase tracking-wider font-mono truncate font-medium ${activeView === 'profile' ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'}`}>{user.role.replace('ROLE_', '')}</p>
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
                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-zinc-300 dark:ring-zinc-700 hover:ring-2 hover:ring-blue-500 transition-all"
                />
                <div className="absolute left-16 px-3 py-1.5 bg-zinc-900 text-zinc-100 text-xs rounded-md shadow-lg border border-zinc-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 whitespace-nowrap z-50">
                  {user.name} ({user.role.replace('ROLE_', '')})
                </div>
              </button>
            )
          )}
          
          <button
            onClick={handleLogout}
            title="Sign Out"
            className={`w-full flex items-center ${
              showExpanded ? 'gap-3 px-3.5 py-2.5 justify-start' : 'justify-center py-2.5'
            } rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[14.5px] font-medium transition-colors cursor-pointer group relative`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {showExpanded && (
              <span className="font-semibold">Sign Out</span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
