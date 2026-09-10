import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Search, Mic, Sun, Moon, Plus, Globe, Check, Trash2, ArrowRight, Menu } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import { requestMobilePushPermission } from '../services/mobilePushService';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState('Sunny, 22°C');
  // Track which notification IDs are currently being processed (prevents double-click)
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  // Track accepted task IDs (survives refresh via sessionStorage)
  const [acceptedTaskIds] = useState<Set<number>>(() => {
    try {
      const stored = sessionStorage.getItem('acceptedTaskIds');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [declineModal, setDeclineModal] = useState<{
    isOpen: boolean;
    notification: any | null;
    task: any | null;
  }>({ isOpen: false, notification: null, task: null });
  const [declineReasonText, setDeclineReasonText] = useState('');

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
      // Poll notifications every 5 seconds for real-time responsiveness
      const interval = setInterval(fetchNotifications, 5000);
      const handleAlert = () => fetchNotifications();
      window.addEventListener('new-notification-alert', handleAlert);
      return () => {
        clearInterval(interval);
        window.removeEventListener('new-notification-alert', handleAlert);
      };
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

  const confirmDeclineFromNotification = async () => {
    if (!declineModal.task || !declineModal.notification || !declineReasonText.trim()) return;
    const task = declineModal.task;
    const n = declineModal.notification;
    const reason = declineReasonText.trim();

    try {
      const commentPayload = {
        content: `🚨 [System Log] Task Declined via Alerts Inbox. Reason: ${reason}`
      };
      await api.post(`/api/tasks/${task.id}/comments`, commentPayload);

      task.status = 'BACKLOG';
      task.assignee = null;
      task.declineReason = reason;
      await api.put(`/api/tasks/${task.id}`, task);

      await api.put(`/api/notifications/${n.id}/read`);
      setNotifications(notifications.filter(item => item.id !== n.id));
      setDeclineModal({ isOpen: false, notification: null, task: null });
      setDeclineReasonText('');
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      console.error('Failed to decline task from notification modal', err);
    }
  };

  const handleNotificationAction = async (n: any, action: 'accept' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();

    // Prevent double-clicks — if already processing this notification, bail out
    if (processingIds.has(n.id)) return;

    if (action === 'accept') {
      // Mark processing immediately for instant button disable
      setProcessingIds(prev => new Set(prev).add(n.id));
      // Optimistic: remove from inbox immediately so user sees instant response
      setNotifications(prev => prev.filter(item => item.id !== n.id));

      try {
        const tasksRes = await api.get('/api/tasks');
        const allTasks: any[] = tasksRes.data || [];

        const searchTitle = n.message
          .replace('You have been assigned: ', '')
          .trim()
          .replace(/^["']|["']$/g, '');

        const matchingTask = allTasks.find(t => {
          const cleanTitle = t.title.trim().replace(/^["']|["']$/g, '').toLowerCase();
          return cleanTitle === searchTitle.toLowerCase() && t.status !== 'COMPLETED';
        });

        if (matchingTask) {
          // Already accepted — just dismiss (backend auto-dismissed the notification)
          if (matchingTask.status === 'ACCEPTED' || matchingTask.status === 'TO_DO' || matchingTask.status === 'IN_PROGRESS') {
            // Persist accepted task ID so refresh keeps button disabled
            const updated = new Set(acceptedTaskIds).add(matchingTask.id);
            sessionStorage.setItem('acceptedTaskIds', JSON.stringify([...updated]));
            await api.put(`/api/notifications/${n.id}/read`);
            window.dispatchEvent(new Event('task-status-updated'));
            return;
          }

          // Transition to ACCEPTED
          matchingTask.status = 'ACCEPTED';
          await api.put(`/api/tasks/${matchingTask.id}`, matchingTask);
          await api.put(`/api/notifications/${n.id}/read`);

          // Persist so refresh doesn't re-enable the button
          const updated = new Set(acceptedTaskIds).add(matchingTask.id);
          sessionStorage.setItem('acceptedTaskIds', JSON.stringify([...updated]));

          window.dispatchEvent(new Event('task-status-updated'));
        } else {
          // No task found — just dismiss the notification
          await api.put(`/api/notifications/${n.id}/read`);
        }
      } catch (err) {
        console.error('Failed to accept task from notification', err);
        // Restore notification on failure
        fetchNotifications();
      } finally {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(n.id);
          return next;
        });
      }
    } else {
      // Decline — open the reason modal
      try {
        const tasksRes = await api.get('/api/tasks');
        const allTasks: any[] = tasksRes.data || [];
        const searchTitle = n.message
          .replace('You have been assigned: ', '')
          .trim()
          .replace(/^["']|["']$/g, '');
        const matchingTask = allTasks.find(t => {
          const cleanTitle = t.title.trim().replace(/^["']|["']$/g, '').toLowerCase();
          return cleanTitle === searchTitle.toLowerCase() && t.status !== 'COMPLETED';
        });
        if (matchingTask) {
          setDeclineReasonText('');
          setDeclineModal({ isOpen: true, notification: n, task: matchingTask });
        } else {
          await api.put(`/api/notifications/${n.id}/read`);
          setNotifications(prev => prev.filter(item => item.id !== n.id));
        }
      } catch (err) {
        console.error('Failed to load task for decline', err);
      }
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
    <header className={`fixed top-0 right-0 left-0 z-20 h-16 glass-navbar flex items-center justify-between px-6 print:hidden ${sidebarExpanded ? 'md:pl-[270px]' : 'md:pl-[92px]'} pl-6 transition-all duration-300 ease-in-out`}>
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
      <div className="flex items-center gap-3">
        {/* Quick Create Dropdown */}
        {user?.role !== 'ROLE_EMPLOYEE' && (
          <div className="relative">
            <button
              ref={quickCreateButtonRef}
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 hover:scale-105 border border-white/20 transition-all cursor-pointer group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden md:inline">+ Quick Create</span>
            </button>
            
            {showQuickCreate && (
              <div 
                ref={quickCreateRef}
                className="absolute right-0 mt-2 w-52 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl py-1.5 shadow-2xl z-50"
              >
                <button
                  onClick={() => triggerQuickAction('project')}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                >
                  📁 + Create New Project
                </button>
                <button
                  onClick={() => triggerQuickAction('task')}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-2"
                >
                  ⚡ + Create New Task
                </button>
                <div className="border-t border-slate-200 dark:border-white/10 my-1"></div>
                <button
                  onClick={() => setPomodoroTimer(true)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400 transition-colors cursor-pointer flex items-center gap-2"
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
          className="w-9.5 h-9.5 flex items-center justify-center rounded-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 transition-all cursor-pointer shadow-xs hover:scale-110 hover:rotate-12"
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-700" />}
        </button>

        {/* Language Selector Dropdown */}
        <div className="relative">
          <button
            ref={languagesButtonRef}
            onClick={() => setShowLanguages(!showLanguages)}
            className="w-9.5 h-9.5 flex items-center justify-center rounded-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer font-bold text-xs shadow-xs hover:scale-110"
          >
            <Globe className="w-4.5 h-4.5" />
          </button>
          {showLanguages && (
            <div 
              ref={languagesRef}
              className="absolute right-0 mt-2 w-32 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl py-1.5 shadow-2xl z-50"
            >
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLanguages(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-500/10 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer flex items-center justify-between"
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
            className="w-9.5 h-9.5 flex items-center justify-center rounded-xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer relative shadow-xs hover:scale-110"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-900 animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div 
              ref={notificationsRef}
              className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl z-50 overflow-hidden rounded-2xl"
            >
              <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white">Alerts Inbox</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const granted = await requestMobilePushPermission();
                      if (granted) {
                        alert("📱 Mobile System & Email Alerts Enabled!\nYou will receive real-time notifications on your phone & desktop.");
                      } else {
                        alert("Notification permission requested. Please enable notification permissions in your browser/phone settings.");
                      }
                    }}
                    className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-md cursor-pointer transition-all flex items-center gap-1"
                    title="Enable Mobile Phone & Browser Push Notifications"
                  >
                    📱 Mobile Alerts
                  </button>
                  {notifications.length > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
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
                      className="p-3 hover:bg-blue-500/10 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {n.type === 'TASK_ASSIGNED' ? (
                        <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'accept', e)}
                            disabled={processingIds.has(n.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1 min-w-[60px] ${
                              processingIds.has(n.id)
                                ? 'bg-slate-400 text-white cursor-not-allowed opacity-60'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            }`}
                          >
                            {processingIds.has(n.id) ? (
                              <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                              </svg>
                            ) : '✓ Accept'}
                          </button>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'decline', e)}
                            disabled={processingIds.has(n.id)}
                            className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white transition-all text-center cursor-pointer"
                          >
                            ✕ Decline
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
            className="flex items-center gap-2 pl-2 border-l border-slate-200/60 dark:border-white/10 cursor-pointer group"
          >
            <img
              src={user.profilePhoto || getAvatarByName(user.name)}
              alt="Avatar"
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-500/60 group-hover:scale-105 transition-all shadow-sm"
            />
          </button>
        )}
      </div>

      {/* Decline Reason Modal from Notification Dropdown */}
      {declineModal.isOpen && declineModal.task && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 space-y-6 border rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
            <div className="space-y-2">
              <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                🚨 Decline Task Assignment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Task: <strong className="text-slate-800 dark:text-slate-200">"{declineModal.task.title}"</strong>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Please provide your decline reason:
                </label>
                <textarea
                  rows={4}
                  value={declineReasonText}
                  onChange={(e) => setDeclineReasonText(e.target.value)}
                  placeholder="Provide details of why you cannot accept this task assignment (scheduling, active tasks, conflicts)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs resize-none"
                />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setDeclineModal({ isOpen: false, notification: null, task: null })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!declineReasonText.trim()}
                  onClick={confirmDeclineFromNotification}
                  className={`px-4 py-2 text-white rounded-xl font-bold text-xs transition-all ${
                    declineReasonText.trim()
                      ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-500/10'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Decline Task
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
}
