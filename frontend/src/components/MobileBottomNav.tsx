import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  ClipboardCheck,
  Settings as SettingsIcon,
  X,
  CheckSquare,
  FolderGit2,
  Clock
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

  // Close quick action sheet when clicking outside
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

  const totalUnreadMessages = Object.values(unreadCounts || {}).reduce((sum, count) => sum + count, 0);

  // Active tab detection
  const isDashboardActive = location.pathname === '/' || location.pathname.includes('/dashboard');
  const isTasksActive =
    location.pathname.startsWith('/tasks') ||
    location.pathname.startsWith('/my-tasks') ||
    location.pathname.startsWith('/projects') ||
    location.pathname.startsWith('/boards');
  const isChatActive = location.pathname === '/messages';
  const isSettingsActive =
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/profile') ||
    location.pathname.startsWith('/organization');

  const activeTabIndex = isDashboardActive
    ? 0
    : isTasksActive
    ? 1
    : isChatActive
    ? 2
    : isSettingsActive
    ? 3
    : -1;

  const [isInMobileChat, setIsInMobileChat] = useState(() =>
    typeof document !== 'undefined' && document.body.classList.contains('mobile-chat-open')
  );

  useEffect(() => {
    const handleChatState = () => {
      setIsInMobileChat(document.body.classList.contains('mobile-chat-open'));
    };
    window.addEventListener('mobile-chat-state-changed', handleChatState);
    return () => window.removeEventListener('mobile-chat-state-changed', handleChatState);
  }, []);

  // When active chat conversation is open on mobile, hide the bottom pill dock so it doesn't block the message composer
  if (isChatActive && isInMobileChat) {
    return null;
  }

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

  const handleSettingsClick = () => {
    setShowCreateSheet(false);
    navigate('/settings');
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
              className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200 dark:border-white/10 p-3 shadow-2xl sm:hidden"
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
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
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
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
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

      {/* iOS / Android Floating Pill Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] left-3 right-3 z-40 max-w-sm mx-auto pointer-events-none select-none">
        <nav
          aria-label="Mobile Navigation Pill"
          className="pointer-events-auto h-[62px] px-2 rounded-full bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_42px_rgba(0,0,0,0.65)] ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-between relative overflow-hidden"
        >
          {/* Sliding Active Pill Capsule - Reduced size, white glassmorphism with specular shine */}
          {activeTabIndex !== -1 && (
            <motion.div
              initial={false}
              animate={{
                left: `${activeTabIndex * 25}%`,
              }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="absolute inset-y-2 w-1/4 px-1.5 py-0.5 pointer-events-none z-0 flex items-center justify-center"
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-b from-white/35 via-white/20 to-white/10 dark:from-white/25 dark:via-white/15 dark:to-white/5 backdrop-blur-md border border-white/45 dark:border-white/30 shadow-[0_4px_16px_rgba(255,255,255,0.12)] relative overflow-hidden">
                {/* Specular glass shine highlight across top */}
                <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/50 to-transparent rounded-t-2xl pointer-events-none" />
              </div>
            </motion.div>
          )}

          {/* Tab 1: Dashboard */}
          <button
            onClick={handleDashboardClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all z-10"
            title="Dashboard"
          >
            <div className="relative z-10 flex flex-col items-center">
              <LayoutGrid
                className={`w-[21px] h-[21px] transition-colors ${
                  isDashboardActive
                    ? 'text-slate-900 dark:text-white stroke-[2.3] drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isDashboardActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                Dashboard
              </span>
            </div>
          </button>

          {/* Tab 2: Tasks */}
          <button
            onClick={handleTasksClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all z-10"
            title="Tasks"
          >
            <div className="relative z-10 flex flex-col items-center">
              <ClipboardCheck
                className={`w-[21px] h-[21px] transition-colors ${
                  isTasksActive
                    ? 'text-slate-900 dark:text-white stroke-[2.3] drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isTasksActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                Tasks
              </span>
            </div>
          </button>

          {/* Tab 3: Chat */}
          <button
            onClick={handleChatClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all z-10"
            title="Chat"
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                {/* Fixed Clean WhatsApp outline speech bubble */}
                <svg
                  className={`w-[21px] h-[21px] transition-colors ${
                    isChatActive
                      ? 'text-slate-900 dark:text-white drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]'
                      : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isChatActive ? 2.3 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21l1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                </svg>

                {/* Unread badge - ONLY show when real unread messages exist */}
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#ef4444] text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111b21] shadow-sm animate-pulse">
                    {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isChatActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                Chat
              </span>
            </div>
          </button>

          {/* Tab 4: Settings */}
          <button
            onClick={handleSettingsClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all z-10"
            title="Settings"
          >
            <div className="relative z-10 flex flex-col items-center">
              <SettingsIcon
                className={`w-[21px] h-[21px] transition-colors ${
                  isSettingsActive
                    ? 'text-slate-900 dark:text-white stroke-[2.3] drop-shadow-[0_1px_4px_rgba(255,255,255,0.25)]'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isSettingsActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-medium'
                }`}
              >
                Settings
              </span>
            </div>
          </button>
        </nav>
      </div>
    </>
  );
}
