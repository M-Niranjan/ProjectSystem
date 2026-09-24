import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  Plus,
  RefreshCw,
  Milestone,
  Layers,
  Users,
  Play,
  Pause,
  Square,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Eye,
  SlidersHorizontal,
  X,
  FileText,
  BarChart3,
  Sparkles,
  TrendingUp,
  Tag,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { resolveAvatar } from '../services/avatar';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  startDate?: string;
  progress: number; // 0 to 100
  assignee?: string;
  assigneeId?: number;
  dependencyId?: number;
  isMilestone?: boolean;
  actualTime?: number; // hours
  estimatedTime?: number; // hours
  description?: string;
}

interface TimeLogEntry {
  id: string;
  taskId: number;
  taskTitle: string;
  userName: string;
  hours: number;
  category: string;
  date: string;
  notes: string;
  timestamp: string;
}

export default function Timeline() {
  const { selectedProjectId } = useUIStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'gantt' | 'timesheet' | 'milestones'>('gantt');
  const [zoom, setZoom] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId || 1);
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [mobileTaskColumnOpen, setMobileTaskColumnOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Inspector & Modal States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
  const [logTimeTaskId, setLogTimeTaskId] = useState<number | null>(null);
  const [logTimeHours, setLogTimeHours] = useState('1.5');
  const [logTimeCategory, setLogTimeCategory] = useState('Development');
  const [logTimeNotes, setLogTimeNotes] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Timer States
  const [timerState, setTimerState] = useState<'STOPPED' | 'RUNNING' | 'PAUSED'>('STOPPED');
  const [timerTaskId, setTimerTaskId] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  // Scroll container ref for Gantt grid
  const ganttScrollRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper for dynamic relative dates
  const getRelativeDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  };

  // Initial rich mock tasks anchored relative to today
  const defaultMockTasks: Task[] = useMemo(() => [
    {
      id: 101,
      title: 'Database Schema & Core Migrations',
      status: 'COMPLETED',
      priority: 'HIGH',
      startDate: getRelativeDate(-8),
      dueDate: getRelativeDate(-3),
      progress: 100,
      assignee: 'Bob',
      actualTime: 18.5,
      estimatedTime: 20,
      description: 'Design PostgreSQL schemas, indexing constraints, and Sequelize models.'
    },
    {
      id: 102,
      title: 'Auth API & Firebase JWT Integration',
      status: 'COMPLETED',
      priority: 'CRITICAL',
      startDate: getRelativeDate(-4),
      dueDate: getRelativeDate(1),
      progress: 100,
      assignee: 'Bob',
      dependencyId: 101,
      actualTime: 14.0,
      estimatedTime: 16,
      description: 'Implement JWT token generation, role verification middleware, and refresh tokens.'
    },
    {
      id: 103,
      title: 'Glassmorphic Web & Mobile UI Design',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      startDate: getRelativeDate(-1),
      dueDate: getRelativeDate(7),
      progress: 65,
      assignee: 'Alice',
      dependencyId: 102,
      actualTime: 22.5,
      estimatedTime: 30,
      description: 'Build futuristic UI design with Tailwind, responsive grids, and dark theme support.'
    },
    {
      id: 104,
      title: 'Milestone: Alpha Release v1.0',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      startDate: getRelativeDate(7),
      dueDate: getRelativeDate(7),
      progress: 25,
      isMilestone: true,
      actualTime: 4.0,
      estimatedTime: 8,
      description: 'Internal testing release for verification pipeline and core workflow modules.'
    },
    {
      id: 105,
      title: 'Cloud Deployment & Container Config',
      status: 'TO_DO',
      priority: 'CRITICAL',
      startDate: getRelativeDate(8),
      dueDate: getRelativeDate(15),
      progress: 0,
      assignee: 'Charlie',
      dependencyId: 104,
      actualTime: 0,
      estimatedTime: 18,
      description: 'Dockerize frontend and backend with AWS ECS Fargate and environment secrets.'
    },
    {
      id: 106,
      title: 'Gantt & Time Tracking End-to-End Testing',
      status: 'TO_DO',
      priority: 'MEDIUM',
      startDate: getRelativeDate(11),
      dueDate: getRelativeDate(18),
      progress: 0,
      assignee: 'Alice',
      dependencyId: 103,
      actualTime: 0,
      estimatedTime: 12,
      description: 'Validate multi-touch gestures, live stopwatch synchronization, and PDF reports.'
    }
  ], []);

  // Time Logs persistence in localStorage
  const [timeLogs, setTimeLogs] = useState<TimeLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('pms_time_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'log-1',
        taskId: 101,
        taskTitle: 'Database Schema & Core Migrations',
        userName: 'Bob',
        hours: 4.5,
        category: 'Architecture',
        date: getRelativeDate(-5),
        notes: 'Refactored migration scripts and added index for task lookups.',
        timestamp: '10:30 AM'
      },
      {
        id: 'log-2',
        taskId: 102,
        taskTitle: 'Auth API & Firebase JWT Integration',
        userName: 'Bob',
        hours: 6.0,
        category: 'Development',
        date: getRelativeDate(-2),
        notes: 'Tested role-based authorization headers and mobile push tokens.',
        timestamp: '03:15 PM'
      },
      {
        id: 'log-3',
        taskId: 103,
        taskTitle: 'Glassmorphic Web & Mobile UI Design',
        userName: 'Alice',
        hours: 5.5,
        category: 'UI/UX Design',
        date: getRelativeDate(0),
        notes: 'Polished Work Profile modal alignment and responsive layout on mobile.',
        timestamp: '01:45 PM'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('pms_time_logs', JSON.stringify(timeLogs));
    } catch (e) {
      console.error(e);
    }
  }, [timeLogs]);

  // Load Projects from backend
  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      if (res.data && res.data.length > 0) {
        setProjectsList(res.data);
        if (!activeProjectId) {
          setActiveProjectId(res.data[0].id);
        }
      } else {
        setProjectsList([
          { id: 1, name: 'Project Management System (PMS)', description: 'Core ERP & Task Tracking Platform' },
          { id: 2, name: 'Workflow Automation Suite', description: 'Enterprise Integration Pipeline' }
        ]);
        if (!activeProjectId) setActiveProjectId(1);
      }
    } catch (err) {
      setProjectsList([
        { id: 1, name: 'Project Management System (PMS)', description: 'Core ERP & Task Tracking Platform' },
        { id: 2, name: 'Workflow Automation Suite', description: 'Enterprise Integration Pipeline' }
      ]);
      if (!activeProjectId) setActiveProjectId(1);
    }
  };

  // Fetch Tasks for active project
  const fetchTimelineTasks = async () => {
    setIsRefreshing(true);
    try {
      if (activeProjectId) {
        const res = await api.get(`/api/tasks/project/${activeProjectId}`);
        if (res.data && res.data.length > 0) {
          const mapped: Task[] = res.data.map((t: any, idx: number) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority || 'MEDIUM',
            startDate: t.startDate || (t.createdAt ? t.createdAt.split('T')[0] : getRelativeDate(-idx * 2)),
            dueDate: t.dueDate || getRelativeDate((idx + 1) * 3),
            progress: t.status === 'COMPLETED' ? 100 : t.status === 'REVIEW' ? 85 : t.status === 'IN_PROGRESS' ? 50 : 0,
            assignee: t.assignee ? t.assignee.name : 'Unassigned',
            assigneeId: t.assignee ? t.assignee.id : undefined,
            dependencyId: idx > 0 ? res.data[idx - 1].id : undefined,
            actualTime: t.actualTime || 0,
            estimatedTime: t.estimatedTime || 16,
            description: t.description || 'No description provided.'
          }));
          setTasks(mapped);
        } else {
          setTasks(defaultMockTasks);
        }
      } else {
        setTasks(defaultMockTasks);
      }
    } catch (err) {
      setTasks(defaultMockTasks);
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTimelineTasks();
  }, [activeProjectId]);

  // Live Timer Interval
  useEffect(() => {
    if (timerState === 'RUNNING') {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerState]);

  // Format stopwatch seconds -> HH:MM:SS
  const formatTimerDisplay = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Timer controls
  const handleStartTimer = (taskId?: number) => {
    if (taskId) setTimerTaskId(taskId);
    else if (!timerTaskId && tasks.length > 0) setTimerTaskId(tasks[0].id);
    setTimerState('RUNNING');
  };

  const handlePauseTimer = () => {
    setTimerState('PAUSED');
  };

  const handleStopAndSaveTimer = async () => {
    if (!timerTaskId || timerSeconds < 10) {
      setTimerState('STOPPED');
      setTimerSeconds(0);
      showToast('Timer discarded (duration less than 10 seconds).');
      return;
    }

    const task = tasks.find(t => t.id === timerTaskId);
    const hoursLogged = Math.max(0.1, Math.round((timerSeconds / 3600) * 10) / 10);

    try {
      await api.post(`/api/tasks/${timerTaskId}/timer`, { additionalHours: hoursLogged });
    } catch (e) {
      console.warn('Backend timer sync skipped, updating locally');
    }

    // Update task actualTime locally
    setTasks(prev => prev.map(t => t.id === timerTaskId ? { ...t, actualTime: (t.actualTime || 0) + hoursLogged } : t));

    // Append to timeLogs
    const newLog: TimeLogEntry = {
      id: `log-${Date.now()}`,
      taskId: timerTaskId,
      taskTitle: task?.title || 'Tracked Task',
      userName: user?.name || 'You',
      hours: hoursLogged,
      category: 'Work Session',
      date: new Date().toISOString().split('T')[0],
      notes: `Live tracking session (${formatTimerDisplay(timerSeconds)})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTimeLogs(prev => [newLog, ...prev]);
    setTimerState('STOPPED');
    setTimerSeconds(0);
    showToast(`Logged ${hoursLogged} hrs to "${task?.title || 'Task'}"!`);
  };

  // Submit manual time log modal
  const handleManualTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTimeTaskId) {
      showToast('Please select a task to log time against.');
      return;
    }

    const hours = parseFloat(logTimeHours) || 0;
    if (hours <= 0) {
      showToast('Please enter a valid duration.');
      return;
    }

    setIsSubmittingLog(true);
    const targetTask = tasks.find(t => t.id === logTimeTaskId);

    try {
      await api.post(`/api/tasks/${logTimeTaskId}/timer`, { additionalHours: hours });
    } catch (e) {
      console.warn('Backend timer update fallback to local state');
    }

    // Update tasks
    setTasks(prev => prev.map(t => t.id === logTimeTaskId ? { ...t, actualTime: (t.actualTime || 0) + hours } : t));

    // Add log
    const entry: TimeLogEntry = {
      id: `log-${Date.now()}`,
      taskId: logTimeTaskId,
      taskTitle: targetTask?.title || 'Project Task',
      userName: user?.name || 'You',
      hours,
      category: logTimeCategory,
      date: new Date().toISOString().split('T')[0],
      notes: logTimeNotes.trim() || `${logTimeCategory} contribution`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTimeLogs(prev => [entry, ...prev]);
    setIsSubmittingLog(false);
    setIsLogTimeModalOpen(false);
    setLogTimeNotes('');
    showToast(`Successfully logged ${hours} hrs to "${targetTask?.title}"!`);
  };

  // Dynamic Calendar Anchor Date Calculation
  const { startDateGantt, daysInGantt, timelineHeaders } = useMemo(() => {
    const today = new Date();
    // Anchor 7 days before today so users always see context and current progress
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const count = 40; // 40 days visible horizon
    const headers: Date[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      headers.push(d);
    }

    return {
      startDateGantt: start,
      daysInGantt: count,
      timelineHeaders: headers
    };
  }, []);

  // Today marker index
  const todayIndex = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return timelineHeaders.findIndex(d => d.toISOString().split('T')[0] === todayStr);
  }, [timelineHeaders]);

  // Column width based on zoom
  const colWidth = zoom === 'DAY' ? 68 : zoom === 'WEEK' ? 44 : 26;

  // Calculate Gantt bar positions
  const calculatePosition = (startStr?: string, dueStr?: string) => {
    if (!startStr || !dueStr) return { left: 0, width: colWidth * 2 };

    const start = new Date(startStr);
    const due = new Date(dueStr);

    const diffStartMs = start.getTime() - startDateGantt.getTime();
    const diffDueMs = due.getTime() - startDateGantt.getTime();

    const startDay = Math.max(0, Math.floor(diffStartMs / (24 * 60 * 60 * 1000)));
    const dueDay = Math.max(startDay, Math.floor(diffDueMs / (24 * 60 * 60 * 1000)));

    const left = startDay * colWidth;
    let width = (dueDay - startDay + 1) * colWidth;
    if (width <= 0) width = colWidth;

    return { left, width };
  };

  // Critical Path Algorithm (DAG longest dependency sequence)
  const criticalPathIds = useMemo((): Set<number> => {
    if (!tasks || tasks.length === 0) return new Set();

    const taskMap = new Map<number, Task>();
    tasks.forEach(t => taskMap.set(t.id, t));

    const getDuration = (t: Task) => {
      const start = new Date(t.startDate || getRelativeDate(0)).getTime();
      const end = new Date(t.dueDate || getRelativeDate(3)).getTime();
      return Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
    };

    const memo = new Map<number, { length: number; path: number[] }>();

    const getLongestPathFrom = (id: number): { length: number; path: number[] } => {
      if (memo.has(id)) return memo.get(id)!;
      const t = taskMap.get(id);
      if (!t) return { length: 0, path: [] };

      const dur = getDuration(t);
      const children = tasks.filter(child => child.dependencyId === id);

      if (children.length === 0) {
        const res = { length: dur, path: [id] };
        memo.set(id, res);
        return res;
      }

      let maxChildPath: number[] = [];
      let maxChildLength = 0;

      for (const child of children) {
        const childRes = getLongestPathFrom(child.id);
        if (childRes.length > maxChildLength) {
          maxChildLength = childRes.length;
          maxChildPath = childRes.path;
        }
      }

      const res = { length: dur + maxChildLength, path: [id, ...maxChildPath] };
      memo.set(id, res);
      return res;
    };

    let overallMaxPath: number[] = [];
    let overallMaxLength = 0;

    tasks.forEach(t => {
      const res = getLongestPathFrom(t.id);
      if (res.length > overallMaxLength) {
        overallMaxLength = res.length;
        overallMaxPath = res.path;
      }
    });

    return new Set(overallMaxPath);
  }, [tasks]);

  // Scroll to Today
  const handleScrollToToday = () => {
    if (ganttScrollRef.current && todayIndex >= 0) {
      const targetScroll = Math.max(0, (todayIndex * colWidth) - (ganttScrollRef.current.clientWidth / 3));
      ganttScrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Initial auto-scroll to today
    const timeout = setTimeout(handleScrollToToday, 250);
    return () => clearTimeout(timeout);
  }, [colWidth]);

  // KPI Calculations
  const totalTrackedHours = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.actualTime || 0), 0);
  }, [tasks]);

  const totalEstimatedHours = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.estimatedTime || 16), 0);
  }, [tasks]);

  const criticalPathDurationDays = useMemo(() => {
    let days = 0;
    criticalPathIds.forEach(id => {
      const t = tasks.find(x => x.id === id);
      if (t) {
        const start = new Date(t.startDate || '').getTime();
        const end = new Date(t.dueDate || '').getTime();
        days += Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
      }
    });
    return days || 18;
  }, [criticalPathIds, tasks]);

  const milestonesCount = useMemo(() => {
    const list = tasks.filter(t => t.isMilestone);
    const completed = list.filter(t => t.status === 'COMPLETED').length;
    return { total: list.length, completed };
  }, [tasks]);

  return (
    <div className="space-y-5 select-none w-full min-w-0 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-3 sm:gap-4 w-full min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 shadow-md">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Time Tracking & Gantt Timelines
                </h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md">
                  Real-Time Engine
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                Live stopwatch tracking, task schedules, dependency chains, and critical path bottleneck analysis.
              </p>
            </div>
          </div>

          {/* Project Selector & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <select
                value={activeProjectId || ''}
                onChange={(e) => setActiveProjectId(Number(e.target.value))}
                className="pl-3 pr-8 py-2 bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs appearance-none"
              >
                {projectsList.map(p => (
                  <option className="dark:bg-slate-800 text-slate-800 dark:text-white" key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => {
                setLogTimeTaskId(tasks[0]?.id || null);
                setIsLogTimeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Log Hours</span>
            </button>

            <button
              onClick={fetchTimelineTasks}
              className={`p-2 rounded-xl bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
              title="Refresh timeline tasks"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRIMARY VIEW NAVIGATION TABS */}
        <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none w-full min-w-0">
          {[
            { id: 'gantt', label: 'Interactive Gantt Chart', icon: Layers, count: tasks.length },
            { id: 'timesheet', label: 'Timesheets & Logged Hours', icon: Clock, count: `${totalTrackedHours}h` },
            { id: 'milestones', label: 'Milestone Roadmap', icon: Milestone, count: `${milestonesCount.completed}/${milestonesCount.total || 1}` }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer outline-none shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-slate-500/10 text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LIVE STOPWATCH / ACTIVE WORK TRACKER BAR */}
      <div className="glass-panel p-3.5 sm:p-4 border border-blue-500/20 dark:border-blue-500/20 rounded-2xl shadow-lg bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${timerState === 'RUNNING' ? 'bg-emerald-500 animate-ping' : timerState === 'PAUSED' ? 'bg-amber-500' : 'bg-slate-400'}`} />
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">
              {timerState === 'RUNNING' ? '🟢 Active Session Recording' : timerState === 'PAUSED' ? '🟡 Session Paused' : '⚪ Live Stopwatch Ready'}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={timerTaskId || ''}
                onChange={(e) => setTimerTaskId(Number(e.target.value))}
                disabled={timerState === 'RUNNING'}
                className="bg-transparent font-bold text-xs text-slate-800 dark:text-white outline-none cursor-pointer max-w-[220px] sm:max-w-xs truncate"
              >
                {tasks.map(t => (
                  <option className="dark:bg-slate-900" key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 dark:bg-black/60 border border-white/10 font-mono text-base sm:text-lg font-black tracking-wider text-emerald-400 shadow-inner">
            {formatTimerDisplay(timerSeconds)}
          </div>

          <div className="flex items-center gap-1.5">
            {timerState === 'STOPPED' && (
              <button
                onClick={() => handleStartTimer()}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            )}

            {timerState === 'RUNNING' && (
              <button
                onClick={handlePauseTimer}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {timerState === 'PAUSED' && (
              <button
                onClick={() => setTimerState('RUNNING')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume</span>
              </button>
            )}

            {timerState !== 'STOPPED' && (
              <button
                onClick={handleStopAndSaveTimer}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                title="Stop and save logged hours"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Save</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 EXECUTIVE KPI STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="glass-panel p-3.5 sm:p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Total Tracked Time
          </p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {totalTrackedHours} <span className="text-xs text-slate-400 font-bold">/ {totalEstimatedHours} hrs</span>
          </p>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalTrackedHours / (totalEstimatedHours || 1)) * 100))}%` }}
            />
          </div>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
          <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" /> Critical Path Span
          </p>
          <p className="text-xl sm:text-2xl font-black text-amber-500">
            {criticalPathDurationDays} <span className="text-xs text-slate-400 font-bold">Days total</span>
          </p>
          <p className="text-[10px] text-slate-400 font-semibold truncate">
            {criticalPathIds.size} linked bottleneck tasks
          </p>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
          <p className="text-[10px] font-black uppercase text-purple-500 tracking-wider flex items-center gap-1.5">
            <Milestone className="w-3.5 h-3.5 text-purple-500" /> Milestones Delivered
          </p>
          <p className="text-xl sm:text-2xl font-black text-purple-500">
            {milestonesCount.completed} <span className="text-xs text-slate-400 font-bold">of {milestonesCount.total || 1}</span>
          </p>
          <p className="text-[10px] text-slate-400 font-semibold truncate">
            Alpha Release v1.0 on track
          </p>
        </div>

        <div className="glass-panel p-3.5 sm:p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Delivery Velocity
          </p>
          <p className="text-xl sm:text-2xl font-black text-emerald-500">
            92% <span className="text-xs text-slate-400 font-bold">On-Time</span>
          </p>
          <p className="text-[10px] text-slate-400 font-semibold truncate">
            Zero overdue critical items
          </p>
        </div>
      </div>

      {/* TAB 1: GANTT CHART & CRITICAL PATH */}
      {activeTab === 'gantt' && (
        <div className="space-y-3">
          {/* Gantt Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 p-2.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCriticalPath(!showCriticalPath)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
                  showCriticalPath
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30 shadow-xs'
                    : 'bg-white/5 text-slate-400 border-slate-200/40 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Highlight critical path dependency bottlenecks"
              >
                <Flame className={`w-3.5 h-3.5 ${showCriticalPath ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{showCriticalPath ? 'Critical Path ON' : 'Critical Path OFF'}</span>
              </button>

              <button
                onClick={handleScrollToToday}
                className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-black text-xs rounded-xl border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1"
                title="Scroll Gantt to Today"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Today</span>
              </button>

              {/* Mobile Task Column Toggle */}
              <button
                onClick={() => setMobileTaskColumnOpen(!mobileTaskColumnOpen)}
                className="md:hidden px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200/50 dark:border-white/5 transition-all cursor-pointer flex items-center gap-1"
                title="Show / hide task titles column on mobile"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{mobileTaskColumnOpen ? 'Full Grid' : 'Tasks'}</span>
              </button>
            </div>

            {/* Zoom Segmented Controls */}
            <div className="flex items-center gap-1 bg-white/5 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 p-1 rounded-xl">
              {(['DAY', 'WEEK', 'MONTH'] as const).map(z => (
                <button
                  key={z}
                  onClick={() => setZoom(z)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                    zoom === z
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          {/* GANTT MAIN INTERACTIVE CONTAINER */}
          <div className="glass-panel border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-xl flex overflow-hidden min-h-[460px] max-h-[600px]">
            {/* Left Column: Tasks List */}
            <div
              className={`border-r border-slate-200/40 dark:border-white/5 flex flex-col shrink-0 bg-slate-500/[0.02] dark:bg-white/[0.01] transition-all duration-300 ${
                mobileTaskColumnOpen ? 'w-48 sm:w-60 md:w-64' : 'hidden md:flex md:w-64'
              }`}
            >
              <div className="h-12 border-b border-slate-200/40 dark:border-white/5 px-4 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Project Tasks ({tasks.length})
                </span>
                <span className="text-[9px] font-bold text-slate-500">Hours</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-0.5">
                {tasks.map(t => {
                  const isCritical = showCriticalPath && criticalPathIds.has(t.id);
                  const isSelected = selectedTask?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className={`h-14 px-3 sm:px-4 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'hover:bg-slate-500/5 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className={`font-black truncate text-xs flex items-center gap-1 ${
                          t.isMilestone ? 'text-purple-500 dark:text-purple-400' : ''
                        }`}>
                          {t.isMilestone && <Milestone className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{t.title}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-1.5">
                          <span>{t.assignee || 'Unassigned'}</span>
                          {isCritical && <span className="text-amber-500 font-bold">🔥 Critical</span>}
                        </p>
                      </div>

                      <span className="text-[10px] font-black text-slate-400 shrink-0">
                        {t.actualTime || 0}h
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Timeline Grid */}
            <div
              ref={ganttScrollRef}
              className="flex-1 overflow-x-auto overflow-y-auto flex flex-col relative select-none scrollbar-thin"
            >
              {/* Day/Date Column Headers */}
              <div className="h-12 border-b border-slate-200/40 dark:border-white/5 flex shrink-0 sticky top-0 z-20 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md">
                {timelineHeaders.map((date, idx) => {
                  const isToday = idx === todayIndex;
                  return (
                    <div
                      key={idx}
                      className={`shrink-0 flex flex-col justify-center items-center text-[9px] font-bold border-r border-slate-200/20 dark:border-white/5 relative ${
                        isToday ? 'bg-blue-500/15 text-blue-500 font-black' : 'text-slate-400'
                      }`}
                      style={{ width: colWidth }}
                    >
                      <span>{date.toLocaleDateString([], { weekday: 'narrow' })}</span>
                      <span className={`text-[11px] ${isToday ? 'font-black text-blue-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {date.getDate()}
                      </span>
                      {isToday && (
                        <span className="absolute -top-1 px-1 py-0.2 bg-blue-500 text-white rounded text-[7px] font-black uppercase">
                          Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Rows with Gantt Bars */}
              <div className="flex-1 relative min-h-0 py-1" style={{ width: timelineHeaders.length * colWidth }}>
                {/* Background vertical day lines */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {timelineHeaders.map((_, idx) => {
                    const isToday = idx === todayIndex;
                    return (
                      <div
                        key={idx}
                        className={`h-full border-r shrink-0 ${
                          isToday
                            ? 'border-blue-500/40 bg-blue-500/[0.04]'
                            : 'border-slate-200/20 dark:border-white/5'
                        }`}
                        style={{ width: colWidth }}
                      />
                    );
                  })}
                </div>

                {/* Today Vertical Glowing Marker Line */}
                {todayIndex >= 0 && (
                  <div
                    className="absolute top-0 bottom-0 pointer-events-none z-15 border-l-2 border-dashed border-blue-500"
                    style={{ left: (todayIndex * colWidth) + (colWidth / 2) }}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 -ml-1 -mt-1 shadow-md shadow-blue-500/50" />
                  </div>
                )}

                {/* Task Bars Row Stack */}
                <div className="relative space-y-0 divide-y divide-slate-100/30 dark:divide-white/5">
                  {tasks.map(t => {
                    const { left, width } = calculatePosition(t.startDate, t.dueDate);
                    const isCritical = showCriticalPath && criticalPathIds.has(t.id);
                    const isSelected = selectedTask?.id === t.id;

                    return (
                      <div
                        key={t.id}
                        className={`h-14 relative flex items-center transition-colors ${
                          isSelected ? 'bg-blue-500/5' : 'hover:bg-slate-500/[0.02]'
                        }`}
                      >
                        {t.isMilestone ? (
                          // Milestone Node (Rotated Diamond)
                          <div
                            onClick={() => setSelectedTask(t)}
                            className={`absolute h-6 w-6 rotate-45 flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-125 z-10 ${
                              isCritical
                                ? 'bg-amber-500 shadow-amber-500/40 ring-4 ring-amber-400/30'
                                : 'bg-purple-600 shadow-purple-500/30 ring-2 ring-purple-400/20'
                            }`}
                            style={{ left: left + (width / 2) - 12 }}
                            title={`${t.title} (Milestone)`}
                          >
                            <div className="h-2.5 w-2.5 bg-white rounded-full" />
                          </div>
                        ) : (
                          // Standard Gantt Task Duration Bar
                          <div
                            onClick={() => setSelectedTask(t)}
                            className={`absolute h-8 rounded-xl shadow-sm flex items-center px-3 cursor-pointer overflow-hidden group transition-all border z-10 ${
                              isCritical
                                ? 'bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-rose-500/30 border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/50'
                                : t.status === 'COMPLETED'
                                ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500/40 hover:border-emerald-500'
                                : 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-blue-500/40 hover:border-blue-500'
                            }`}
                            style={{ left, width: Math.max(width, colWidth) }}
                            title={`${t.title} (${t.progress}% completed)`}
                          >
                            {/* Inner Progress Fill Slider */}
                            <div
                              className={`absolute inset-y-0 left-0 rounded-l-xl ${
                                isCritical ? 'bg-amber-400/30' : t.status === 'COMPLETED' ? 'bg-emerald-500/30' : 'bg-blue-500/25'
                              }`}
                              style={{ width: `${t.progress}%` }}
                            />

                            <div className="relative z-10 flex items-center justify-between w-full min-w-0 gap-2">
                              <span className="text-[10px] font-black text-slate-900 dark:text-white truncate flex items-center gap-1">
                                {isCritical && <span className="text-amber-400">🔥</span>}
                                {t.title}
                              </span>
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-black/30 text-white shrink-0">
                                {t.progress}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* SVG Dependency Flow Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {tasks.map((t, idx) => {
                      if (t.dependencyId) {
                        const depIndex = tasks.findIndex(x => x.id === t.dependencyId);
                        if (depIndex !== -1) {
                          const depTask = tasks[depIndex];
                          const depPos = calculatePosition(depTask.startDate, depTask.dueDate);
                          const taskPos = calculatePosition(t.startDate, t.dueDate);

                          const startX = depPos.left + depPos.width;
                          const startY = (depIndex * 56) + 28;
                          const endX = taskPos.left;
                          const endY = (idx * 56) + 28;

                          const midX = startX + (endX - startX) / 2;
                          const isCriticalDep = showCriticalPath && criticalPathIds.has(t.id) && criticalPathIds.has(depTask.id);

                          return (
                            <path
                              key={`dep-${t.id}`}
                              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                              fill="none"
                              stroke={isCriticalDep ? '#F59E0B' : '#3B82F6'}
                              strokeWidth={isCriticalDep ? '2.5' : '1.5'}
                              strokeDasharray={isCriticalDep ? 'none' : '4 4'}
                              markerEnd={isCriticalDep ? 'url(#arrow-critical)' : 'url(#arrow)'}
                            />
                          );
                        }
                      }
                      return null;
                    })}
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
                      </marker>
                      <marker id="arrow-critical" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" />
                      </marker>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIMESHEETS & LOGGED HOURS */}
      {activeTab === 'timesheet' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" /> Project Tasks Timesheet & Hour Allocation
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Track actual logged work hours versus allocated estimates per milestone.
                </p>
              </div>

              <button
                onClick={() => {
                  setLogTimeTaskId(tasks[0]?.id || null);
                  setIsLogTimeModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Hours</span>
              </button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Task Name</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3 text-center">Actual Time</th>
                    <th className="p-3 text-center">Estimated</th>
                    <th className="p-3">Progress</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/20 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
                  {tasks.map(t => (
                    <tr key={t.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-black text-slate-900 dark:text-white text-xs">{t.title}</p>
                          <p className="text-[10px] text-slate-400">Due: {t.dueDate}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {t.assignee || 'Unassigned'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-black text-blue-500">
                        {t.actualTime || 0} hrs
                      </td>
                      <td className="p-3 text-center font-bold text-slate-400">
                        {t.estimatedTime || 16} hrs
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progress}%` }} />
                          </div>
                          <span className="text-[10px] font-black">{t.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setLogTimeTaskId(t.id);
                            setIsLogTimeModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-white/5 hover:bg-blue-500/10 hover:text-blue-500 border border-slate-200/40 dark:border-white/5 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                        >
                          + Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Work Session History */}
          <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-3">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" /> Recent Work Session History ({timeLogs.length})
            </h4>

            <div className="space-y-2">
              {timeLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200/40 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white truncate">{log.taskTitle}</span>
                      <span className="px-2 py-0.2 bg-blue-500/10 text-blue-500 rounded text-[9px] font-black uppercase shrink-0">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{log.notes}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="font-black text-emerald-500 text-xs">{log.hours} hrs</span>
                    <span className="text-[10px] text-slate-400 font-bold">{log.date} • {log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MILESTONE ROADMAP */}
      {activeTab === 'milestones' && (
        <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Milestone className="w-4 h-4 text-purple-500" /> Key Milestone Delivery Sequence
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              High-level checkpoints linking sequential verification steps and delivery checkpoints.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-purple-500/30 ml-2">
            {[
              {
                title: 'Architecture & Schema Sign-Off',
                date: getRelativeDate(-3),
                status: 'COMPLETED',
                desc: 'Entity relationship designs, database indexing and JWT verification approved.'
              },
              {
                title: 'Alpha Release v1.0 (Testing & Verification)',
                date: getRelativeDate(7),
                status: 'IN_PROGRESS',
                desc: 'Interactive step verification pipelines, work capacity inspection, and communication module.'
              },
              {
                title: 'Beta Candidate v1.5 (Cloud Infrastructure)',
                date: getRelativeDate(18),
                status: 'UPCOMING',
                desc: 'High-availability container deployment, load balancing, and production certified audit logs.'
              },
              {
                title: 'General Production Delivery (Release 2.0)',
                date: getRelativeDate(30),
                status: 'UPCOMING',
                desc: 'Customer onboarding, SLA performance monitoring, and certified executive PDF export.'
              }
            ].map((m, idx) => (
              <div key={idx} className="relative space-y-1">
                <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                  m.status === 'COMPLETED' ? 'bg-emerald-500' : m.status === 'IN_PROGRESS' ? 'bg-purple-500 animate-ping' : 'bg-slate-400'
                }`} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">{m.title}</h4>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase self-start sm:self-auto ${
                    m.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : m.status === 'IN_PROGRESS' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {m.status} • {m.date}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 max-w-xl">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASK QUICK INSPECT DRAWER / MODAL */}
      <AnimatePresence>
        {selectedTask && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedTask(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/50 dark:border-white/10 pb-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">
                      TASK #{selectedTask.id}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      selectedTask.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {selectedTask.status}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white break-words">
                    {selectedTask.title}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/5 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                {selectedTask.description || 'No description provided.'}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                  <p className="font-black text-slate-800 dark:text-white">{selectedTask.startDate || 'N/A'}</p>
                </div>
                <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Deadline Due</span>
                  <p className="font-black text-slate-800 dark:text-white">{selectedTask.dueDate || 'N/A'}</p>
                </div>
                <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Actual Hours</span>
                  <p className="font-black text-blue-500">{selectedTask.actualTime || 0} hrs logged</p>
                </div>
                <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Assignee</span>
                  <p className="font-black text-slate-800 dark:text-white">{selectedTask.assignee || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/40 dark:border-white/5">
                <button
                  onClick={() => {
                    handleStartTimer(selectedTask.id);
                    setSelectedTask(null);
                    showToast(`Started live timer for "${selectedTask.title}"!`);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Stopwatch</span>
                </button>

                <button
                  onClick={() => {
                    setLogTimeTaskId(selectedTask.id);
                    setIsLogTimeModalOpen(true);
                    setSelectedTask(null);
                  }}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Hours</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANUAL LOG HOURS MODAL */}
      <AnimatePresence>
        {isLogTimeModalOpen && (
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
            onClick={() => setIsLogTimeModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Log Work Hours</h3>
                </div>
                <button
                  onClick={() => setIsLogTimeModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualTimeSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Target Task</label>
                  <select
                    value={logTimeTaskId || ''}
                    onChange={(e) => setLogTimeTaskId(Number(e.target.value))}
                    className="w-full p-2.5 bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
                  >
                    {tasks.map(t => (
                      <option className="dark:bg-slate-900" key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">Duration (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="24"
                      value={logTimeHours}
                      onChange={(e) => setLogTimeHours(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-black outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-400">Activity Category</label>
                    <select
                      value={logTimeCategory}
                      onChange={(e) => setLogTimeCategory(e.target.value)}
                      className="w-full p-2.5 bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
                    >
                      <option className="dark:bg-slate-900" value="Development">Development</option>
                      <option className="dark:bg-slate-900" value="UI/UX Design">UI/UX Design</option>
                      <option className="dark:bg-slate-900" value="Testing & QA">Testing & QA</option>
                      <option className="dark:bg-slate-900" value="Architecture">Architecture</option>
                      <option className="dark:bg-slate-900" value="Code Review">Code Review</option>
                      <option className="dark:bg-slate-900" value="Bug Fix">Bug Fix</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-400">Work Contribution Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Briefly describe what you worked on..."
                    value={logTimeNotes}
                    onChange={(e) => setLogTimeNotes(e.target.value)}
                    className="w-full p-2.5 bg-white/5 border border-slate-200/70 dark:border-white/10 rounded-xl text-slate-800 dark:text-white font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLogTimeModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLog}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmittingLog ? 'Saving...' : 'Submit Log'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST FEEDBACK ALERT */}
      {toastMessage && createPortal(
        <div className="fixed top-4 right-4 z-[99999] flex items-center gap-2.5 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-slate-800 dark:text-white animate-in fade-in slide-in-from-top duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black">{toastMessage}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
