import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Plus,
  MessageSquare,
  Search,
  FolderGit2,
  Clock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCommunicationStore } from '../store/useCommunicationStore';
import { getDashboardPathForRole } from '../services/authRoles';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setProjectModalOpen, setTaskModalOpen, setPomodoroTimer } = useUIStore();
  const { unreadCounts } = useCommunicationStore();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close create sheet when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setShowCreateSheet(false);
      }
    };
    if (showCreateSheet) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateSheet]);

  // Don't render on messages page (Messages.tsx has its own WhatsApp tabs) or desktop
  if (location.pathname === '/messages') {
    return null;
  }

  const totalUnreadMessages = Object.values(unreadCounts || {}).reduce((sum, count) => sum + count, 0);

  const isDashboardActive = location.pathname === '/' || location.pathname.includes('/dashboard');
  const isTasksActive = location.pathname.startsWith('/tasks') || location.pathname.startsWith('/my-tasks') || location.pathname.startsWith('/projects');
  const isChatActive = location.pathname === '/messages';

  const handleDashboardClick = () => {
    setShowCreateSheet(false);
    const target = getDashboardPathForRole(user?.role) || '/dashboard';
    navigate(target);
  };

  const handleTasksClick = () => {
    setShowCreateSheet(false);
    navigate('/tasks');
  };

  const handleChatClick = () => {
    setShowCreateSheet(false);
    navigate('/messages');
  };

  const handleSearchClick = () => {
    setShowCreateSheet(false);
    window.dispatchEvent(new Event('open-search-palette'));
  };

  return (
    <>
      {/* Quick Action Sheet Modal */}
      <AnimatePresence>
        {showCreateSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs sm:hidden"
              onClick={() => setShowCreateSheet(false)}
            />
            <motion.div
              ref={sheetRef}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200 dark:border-white/10 p-3 shadow-2xl sm:hidden"
            >
              <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100 dark:border-white/5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Quick Actions</span>
                <button
                  onClick={() => setShowCreateSheet(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setShowCreateSheet(false);
                    setTaskModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Create New Task</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Assign milestone steps & deliverables</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowCreateSheet(false);
                    setProjectModalOpen(true);
                  }}
                  className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                    <FolderGit2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Create New Project</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Initiate workspace projects & boards</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowCreateSheet(false);
                    setPomodoroTimer(true);
                  }}
                  className="w-full p-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-white/5 text-left transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Focus Timer</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Pomodoro focus sprint timer</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Fixed Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-30 h-16 pb-[max(0.4rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#0b0e17]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 shadow-[0_-8px_25px_rgba(0,0,0,0.25)] flex items-center justify-around px-2 select-none"
      >
        {/* Tab 1: Dashboard */}
        <button
          onClick={handleDashboardClick}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all cursor-pointer ${
            isDashboardActive
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Dashboard"
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {isDashboardActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold">Dashboard</span>
        </button>

        {/* Tab 2: Tasks */}
        <button
          onClick={handleTasksClick}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all cursor-pointer ${
            isTasksActive
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Tasks"
        >
          <div className="relative">
            <CheckSquare className="w-5 h-5" />
            {isTasksActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold">Tasks</span>
        </button>

        {/* Tab 3: Elevated Center Action Button (+) */}
        <div className="relative flex items-center justify-center w-14">
          <button
            onClick={() => setShowCreateSheet(!showCreateSheet)}
            className={`w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-2 border-white dark:border-[#0b0e17] transition-all transform active:scale-95 cursor-pointer hover:shadow-blue-500/50 ${
              showCreateSheet ? 'rotate-45' : ''
            }`}
            title="Create Task or Project"
            aria-label="Create Task or Project"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 4: Chat */}
        <button
          onClick={handleChatClick}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all cursor-pointer relative ${
            isChatActive
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {totalUnreadMessages > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-1 bg-[#25D366] text-[#0b141a] text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0b0e17]">
                {totalUnreadMessages > 9 ? '9+' : totalUnreadMessages}
              </span>
            )}
            {isChatActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm" />
            )}
          </div>
          <span className="text-[10px] mt-1 font-semibold">Chat</span>
        </button>

        {/* Tab 5: Search */}
        <button
          onClick={handleSearchClick}
          className="flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          title="Search"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-semibold">Search</span>
        </button>
      </nav>
    </>
  );
}
