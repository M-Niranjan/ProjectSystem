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
    activeView,
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
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
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

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeclineFromNotification = async () => {
    const { notification, task } = declineModal;
    if (!notification || !task || !declineReasonText.trim()) return;

    try {
      setProcessingIds(prev => new Set(prev).add(notification.id));
      await api.put(`/api/tasks/${task.id}/status`, {
        status: 'DECLINED',
        declineReason: declineReasonText.trim(),
      });
      await api.put(`/api/notifications/${notification.id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      setDeclineModal({ isOpen: false, notification: null, task: null });
      setDeclineReasonText('');
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      console.error('Failed to decline task', err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        if (notification) next.delete(notification.id);
        return next;
      });
    }
  };

  const handleNotificationAction = async (n: Notification, action: 'accept' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();
    if (processingIds.has(n.id)) return;

    if (action === 'accept') {
      try {
        setProcessingIds(prev => new Set(prev).add(n.id));
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
          await api.put(`/api/tasks/${matchingTask.id}/status`, {
            status: 'ACCEPTED',
          });

          await api.put(`/api/notifications/${n.id}/read`);
          setNotifications(prev => prev.filter(item => item.id !== n.id));

          const updated = new Set(acceptedTaskIds).add(matchingTask.id);
          sessionStorage.setItem('acceptedTaskIds', JSON.stringify([...updated]));
          window.dispatchEvent(new Event('task-status-updated'));
        } else {
          await api.put(`/api/notifications/${n.id}/read`);
        }
      } catch (err) {
        console.error('Failed to accept task from notification', err);
        fetchNotifications();
      } finally {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(n.id);
          return next;
        });
      }
    } else {
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
    <header className={`fixed top-0 right-0 left-0 z-20 h-14 glass-navbar flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-4 print:hidden ${sidebarExpanded ? 'md:pl-[286px]' : 'md:pl-[92px]'} transition-all duration-200 ease-in-out`}>
      {/* Search Input bar */}
      <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
        <button
          onClick={toggleSidebar}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer flex-shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div 
          onClick={triggerSearchPalette}
          className="w-full h-9 flex items-center justify-between gap-1.5 sm:gap-2 px-3 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 text-xs cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors select-none"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            <span className="truncate text-xs">Search...</span>
          </div>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 rounded font-mono">
            ⌘K
          </kbd>
        </div>

        <button
          onClick={() => setVoiceOverlay(true)}
          className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-indigo-600/10 text-zinc-500 hover:text-indigo-600 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer flex-shrink-0"
          title="Voice command palette"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Navbar Items */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {user?.role !== 'ROLE_EMPLOYEE' && (
          <div className="relative flex-shrink-0">
            <button
              ref={quickCreateButtonRef}
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="w-9 h-9 md:w-auto md:px-3 h-9 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium text-xs shadow-xs transition-colors cursor-pointer"
              title="Create new project or task"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline">Create</span>
            </button>
            
            {showQuickCreate && (
              <div 
                ref={quickCreateRef}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 shadow-lg z-50"
              >
                <button
                  onClick={() => triggerQuickAction('project')}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"
                >
                  Create Project
                </button>
                <button
                  onClick={() => triggerQuickAction('task')}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer flex items-center gap-2"
                >
                  Create Task
                </button>
                <div className="border-t border-zinc-200 dark:border-zinc-800 my-1"></div>
                <button
                  onClick={() => setPomodoroTimer(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer flex items-center gap-2"
                >
                  Focus Timer
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex-shrink-0"
          title="Toggle Light/Dark Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />}
        </button>

        <div className="hidden sm:block relative flex-shrink-0">
          <button
            ref={languagesButtonRef}
            onClick={() => setShowLanguages(!showLanguages)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer font-medium text-xs"
            title="Language"
          >
            <Globe className="w-4 h-4" />
          </button>
          {showLanguages && (
            <div 
              ref={languagesRef}
              className="absolute right-0 mt-2 w-28 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg py-1 shadow-lg z-50"
            >
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang);
                    setShowLanguages(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer flex items-center justify-between"
                >
                  {lang}
                  {activeLanguage === lang && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex-shrink-0">
          <button
            ref={notificationButtonRef}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
                {notifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div 
              ref={notificationsRef}
              className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 overflow-hidden rounded-xl"
            >
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Notifications</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const granted = await requestMobilePushPermission();
                      if (granted) {
                        alert("Mobile System & Email Alerts Enabled!");
                      } else {
                        alert("Notification permission requested.");
                      }
                    }}
                    className="text-[10px] font-medium px-2 py-0.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 rounded cursor-pointer transition-colors"
                  >
                    Mobile Alerts
                  </button>
                  {notifications.length > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] text-zinc-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      onClick={() => setView('tasks')}
                      className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex items-start gap-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{n.title}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {n.type === 'TASK_ASSIGNED' ? (
                        <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'accept', e)}
                            disabled={processingIds.has(n.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => handleNotificationAction(n, 'decline', e)}
                            disabled={processingIds.has(n.id)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
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

        {user && (
          <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 flex-shrink-0">
            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
            <button
              onClick={() => setView('profile')}
              className={`w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all flex-shrink-0 ${
                activeView === 'profile'
                  ? 'ring-2 ring-blue-500 bg-blue-500/10'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
              }`}
              title="View Profile Resume"
              aria-label="View My Profile"
            >
              <img
                src={user.profilePhoto || getAvatarByName(user.name)}
                alt="Avatar"
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-zinc-300 dark:ring-zinc-700"
              />
            </button>
          </div>
        )}
      </div>

      {declineModal.isOpen && declineModal.task && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md p-5 space-y-4 border rounded-xl border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
            <div className="space-y-1">
              <h2 className="text-sm font-bold flex items-center gap-2">
                Decline Task Assignment
              </h2>
              <p className="text-xs text-zinc-500">
                Task: <strong className="text-zinc-800 dark:text-zinc-200">"{declineModal.task.title}"</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-zinc-500">
                  Decline Reason:
                </label>
                <textarea
                  rows={3}
                  value={declineReasonText}
                  onChange={(e) => setDeclineReasonText(e.target.value)}
                  placeholder="Provide details of why you cannot accept this task assignment..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-100 text-xs resize-none"
                />
              </div>
              
              <div className="flex justify-between items-center pt-1">
                <button
                  onClick={() => setDeclineModal({ isOpen: false, notification: null, task: null })}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!declineReasonText.trim()}
                  onClick={confirmDeclineFromNotification}
                  className={`px-3 py-1.5 text-white rounded-lg text-xs font-medium ${
                    declineReasonText.trim()
                      ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer'
                      : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
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
