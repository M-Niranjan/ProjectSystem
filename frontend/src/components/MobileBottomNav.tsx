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
  const unreadDisplayCount = totalUnreadMessages > 0 ? (totalUnreadMessages > 99 ? '99+' : totalUnreadMessages) : 3;

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

      {/* iOS Floating Pill Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-3 left-3 right-3 z-40 max-w-sm mx-auto pointer-events-none select-none">
        <nav
          aria-label="Mobile Navigation Pill"
          className="pointer-events-auto h-[62px] px-2.5 rounded-full bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_42px_rgba(0,0,0,0.65)] ring-1 ring-black/5 dark:ring-white/5 flex items-center justify-between relative"
        >
          {/* Tab 1: Dashboard */}
          <button
            onClick={handleDashboardClick}
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all"
            title="Dashboard"
          >
            {isDashboardActive && (
              <motion.div
                layoutId="floatingPillActiveCapsule"
                className="absolute inset-y-1.5 inset-x-1.5 rounded-full bg-emerald-600/20 dark:bg-[#153e2d] border border-emerald-500/30 shadow-sm"
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <LayoutGrid
                className={`w-[21px] h-[21px] transition-colors ${
                  isDashboardActive
                    ? 'text-emerald-700 dark:text-[#25D366] stroke-[2.3]'
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isDashboardActive
                    ? 'text-emerald-700 dark:text-[#25D366] font-bold'
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
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all"
            title="Tasks"
          >
            {isTasksActive && (
              <motion.div
                layoutId="floatingPillActiveCapsule"
                className="absolute inset-y-1.5 inset-x-1.5 rounded-full bg-emerald-600/20 dark:bg-[#153e2d] border border-emerald-500/30 shadow-sm"
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <ClipboardCheck
                className={`w-[21px] h-[21px] transition-colors ${
                  isTasksActive
                    ? 'text-emerald-700 dark:text-[#25D366] stroke-[2.3]'
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isTasksActive
                    ? 'text-emerald-700 dark:text-[#25D366] font-bold'
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
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all"
            title="Chat"
          >
            {isChatActive && (
              <motion.div
                layoutId="floatingPillActiveCapsule"
                className="absolute inset-y-1.5 inset-x-1.5 rounded-full bg-emerald-600/20 dark:bg-[#153e2d] border border-emerald-500/30 shadow-sm"
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative">
                {/* WhatsApp outline speech bubble */}
                <svg
                  className={`w-[21px] h-[21px] transition-colors ${
                    isChatActive
                      ? 'text-emerald-700 dark:text-[#25D366]'
                      : 'text-slate-700 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isChatActive ? 2.3 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>

                {/* WhatsApp unread badge */}
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-[#ef4444] text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#111b21] shadow-sm">
                  {unreadDisplayCount}
                </span>
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isChatActive
                    ? 'text-emerald-700 dark:text-[#25D366] font-bold'
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
            className="relative flex-1 flex flex-col items-center justify-center h-full cursor-pointer py-1 group transition-all"
            title="Settings"
          >
            {isSettingsActive && (
              <motion.div
                layoutId="floatingPillActiveCapsule"
                className="absolute inset-y-1.5 inset-x-1.5 rounded-full bg-emerald-600/20 dark:bg-[#153e2d] border border-emerald-500/30 shadow-sm"
                transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              />
            )}
            <div className="relative z-10 flex flex-col items-center">
              <SettingsIcon
                className={`w-[21px] h-[21px] transition-colors ${
                  isSettingsActive
                    ? 'text-emerald-700 dark:text-[#25D366] stroke-[2.3]'
                    : 'text-slate-700 dark:text-slate-300 group-hover:text-black dark:group-hover:text-white stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                  isSettingsActive
                    ? 'text-emerald-700 dark:text-[#25D366] font-bold'
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
