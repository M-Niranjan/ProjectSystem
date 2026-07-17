import React from 'react';
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
  Sparkles
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';

interface SidebarItem {
  name: string;
  view: string;
  icon: React.ComponentType<any>;
}

export default function Sidebar() {
  const { sidebarExpanded, toggleSidebar, activeView, setView } = useUIStore();
  const { logout, user } = useAuthStore();

  const menuItems: SidebarItem[] = [
    { name: 'Dashboard', view: 'dashboard', icon: LayoutDashboard },
    { name: 'Projects', view: 'projects', icon: FolderGit2 },
    { name: 'Tasks', view: 'tasks', icon: CheckSquare },
    { name: 'Kanban Board', view: 'boards', icon: Kanban },
    { name: 'Calendar', view: 'calendar', icon: Calendar },
    { name: 'Gantt Timeline', view: 'timeline', icon: Clock },
    { name: 'Team Hub', view: 'teams', icon: Users },
    { name: 'Workspace Docs', view: 'documents', icon: FileText },
    { name: 'Team Chat', view: 'messages', icon: MessageSquare },
    { name: 'Reports & Analytics', view: 'reports', icon: BarChart3 },
    { name: 'Profile Resume', view: 'profile', icon: UserCircle },
    { name: 'Hub Settings', view: 'settings', icon: Settings },
  ];

  const allowedItems = menuItems.filter(item => {
    if (user?.role === 'ROLE_EMPLOYEE') {
      const blockedViews = ['projects', 'timeline', 'teams', 'reports'];
      return !blockedViews.includes(item.view);
    }
    return true;
  });

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of Prologue?')) {
      logout();
    }
  };

  return (
    <motion.aside
      animate={{ width: sidebarExpanded ? 260 : 76 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 bottom-0 z-30 h-screen glass-panel rounded-none border-t-0 border-l-0 border-b-0 flex flex-col justify-between py-6"
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center justify-between px-4 mb-8">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            {sidebarExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-black text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400"
              >
                PROLOGUE
              </motion.span>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
          >
            {sidebarExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="px-3 space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/15'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'scale-110' : ''}`} />
                {sidebarExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footnote */}
      <div className="px-3 space-y-4">
        {sidebarExpanded && user && (
          <div className="mx-2 p-3 bg-white/5 border border-slate-200/20 dark:border-white/5 rounded-xl flex items-center gap-3 overflow-hidden">
            <img
              src={user.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
              alt="avatar"
              className="w-9 h-9 rounded-lg object-cover ring-2 ring-blue-500/20 flex-shrink-0"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">{user.role.replace('ROLE_', '')}</p>
            </div>
          </div>
        )}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 font-bold text-sm transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarExpanded && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Sign Out Hub
            </motion.span>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
