import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Mic, Sun, Moon, Plus, Globe, Check, Trash2, ArrowRight, Menu } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Navbar() {
  const { 
    darkMode, 
    toggleTheme, 
    activeLanguage, 
    setLanguage, 
    setView, 
    setVoiceOverlay, 
    setPomodoroTimer,
    setProjectModalOpen,
    setTaskModalOpen,
    sidebarExpanded,
    toggleSidebar
  } = useUIStore();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const languages = ['EN', 'ES', 'FR', 'DE', 'JA'];

  const notificationsRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  const quickCreateRef = useRef<HTMLDivElement>(null);
  const quickCreateButtonRef = useRef<HTMLButtonElement>(null);

  const languagesRef = useRef<HTMLDivElement>(null);
  const languagesButtonRef = useRef<HTMLButtonElement>(null);

  // Click outside to close all dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (showNotifications && 
          notificationsRef.current && !notificationsRef.current.contains(target) &&
          notificationButtonRef.current && !notificationButtonRef.current.contains(target)) {
        setShowNotifications(false);
      }

      if (showQuickCreate && 
          quickCreateRef.current && !quickCreateRef.current.contains(target) &&
          quickCreateButtonRef.current && !quickCreateButtonRef.current.contains(target)) {
        setShowQuickCreate(false);
      }

      if (showLanguages && 
          languagesRef.current && !languagesRef.current.contains(target) &&
          languagesButtonRef.current && !languagesButtonRef.current.contains(target)) {
        setShowLanguages(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications, showQuickCreate, showLanguages]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/notifications/unread');
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 10 seconds for real-time responsiveness
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const markAsRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationAction = async (n: any, action: 'accept' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const tasksRes = await api.get('/api/tasks');
      const allTasks = tasksRes.data || [];
      
      let searchTitle = n.message.replace('You have been assigned: ', '').trim();
      
      const matchingTask = allTasks.find(
        (t: any) => t.title.toLowerCase() === searchTitle.toLowerCase() && t.status === 'PENDING_ACCEPTANCE'
      );
      
      if (matchingTask) {
        if (action === 'accept') {
          matchingTask.status = 'TO_DO';
          await api.put(`/api/tasks/${matchingTask.id}`, matchingTask);
        } else {
          const reason = prompt("Enter reason for declining the task:") || "Declined via Alerts Inbox";
          const commentPayload = {
            content: `🚨 [System Log] Task Declined via Alerts Inbox. Reason: ${reason}`
          };
          await api.post(`/api/tasks/${matchingTask.id}/comments`, commentPayload);

          matchingTask.status = 'BACKLOG';
          matchingTask.assignee = null;
          await api.put(`/api/tasks/${matchingTask.id}`, matchingTask);
        }
      }
      
      await api.put(`/api/notifications/${n.id}/read`);
      setNotifications(notifications.filter(item => item.id !== n.id));
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      console.error('Failed to perform task action from notification', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications([]);
      setShowNotifications(false);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerQuickAction = (actionType: 'project' | 'task') => {
    setShowQuickCreate(false);
    if (actionType === 'project') {
      setProjectModalOpen(true);
    } else {
      setTaskModalOpen(true);
    }
  };

  const triggerSearchPalette = () => {
    window.dispatchEvent(new Event('open-search-palette'));
  };

  return (
    <header className={`fixed top-0 right-0 left-0 z-20 h-16 glass-navbar flex items-center justify-between px-6 ${sidebarExpanded ? 'md:pl-[272px]' : 'md:pl-[88px]'} pl-6 transition-all duration-400`}>
      {/* Search Input bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {/* Mobile menu hamburger toggle button */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl bg-slate-100/50 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200/50 dark:border-white/5 cursor-pointer transition-colors"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={triggerSearchPalette}
          className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-400 dark:text-slate-500 text-sm font-semibold cursor-pointer hover:border-slate-300 dark:hover:border-white/10 transition-all select-none"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Search workspace...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-500 rounded font-black font-sans uppercase">
            Ctrl + K
          </kbd>
        </div>

        {/* Voice Trigger Microphone */}
        <button
          onClick={() => setVoiceOverlay(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100/50 dark:bg-white/5 hover:bg-blue-500/10 text-slate-500 hover:text-blue-500 border border-slate-200/50 dark:border-white/5 transition-all cursor-pointer"
          title="Voice command palette"
        >
          <Mic className="w-4.5 h-4.5 animate-pulse" />
        </button>
      </div>

      {/* Right Navbar Items */}
      <div className="flex items-center gap-4">
        {/* Quick Create Dropdown */}
        {user?.role !== 'ROLE_EMPLOYEE' && (
          <div className="relative">
            <button
              ref={quickCreateButtonRef}
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Quick Create</span>
            </button>
            
            {showQuickCreate && (
              <div 
                ref={quickCreateRef}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-1.5 shadow-xl z-50"
              >
                <button
                  onClick={() => triggerQuickAction('project')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  + Create New Project
                </button>
                <button
                  onClick={() => triggerQuickAction('task')}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  + Create New Task
                </button>
                <div className="border-t border-slate-200 dark:border-slate-800 my-1"></div>
                <button
                  onClick={() => setPomodoroTimer(true)}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                >
                  ⏱️ Open Focus Timer
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500" /> : <Moon className="w-4.5 h-4.5 text-slate-600" />}
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            ref={languagesButtonRef}
            onClick={() => setShowLanguages(!showLanguages)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer font-bold text-xs"
          >
            <Globe className="w-4.5 h-4.5 mr-0.5" />
            <span className="sr-only">Lang</span>
          </button>
          {showLanguages && (
            <div 
              ref={languagesRef}
              className="absolute right-0 mt-2 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-1.5 shadow-xl z-50"
            >
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLanguages(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                >
                  {lang}
                  {activeLanguage === lang && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            ref={notificationButtonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer relative"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div 
              ref={notificationsRef}
              className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden rounded-2xl"
            >
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">Alerts Inbox</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs font-medium text-slate-400">
                    Your alerts inbox is clear! 🎉
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => setView('tasks')}
                      className="p-3 hover:bg-white/5 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {n.type === 'TASK_ASSIGNED' ? (
                        <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'accept', e)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'decline', e)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            Unaccept
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          className="text-slate-400 hover:text-blue-500 p-0.5 rounded cursor-pointer transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Link */}
        {user && (
          <button
            onClick={() => setView('profile')}
            className="flex items-center gap-2 pl-2 border-l border-slate-200/50 dark:border-white/5 cursor-pointer"
          >
            <img
              src={user.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`}
              alt="Avatar"
              className="w-8.5 h-8.5 rounded-lg object-cover ring-2 ring-blue-500/10 hover:ring-blue-500/30 transition-all"
            />
          </button>
        )}
      </div>
    </header>
  );
}
