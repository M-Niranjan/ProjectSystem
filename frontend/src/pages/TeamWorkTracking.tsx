import { getAvatarByName, resolveAvatar } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Users,
  CheckSquare,
  Clock,
  AlertCircle,
  ShieldCheck,
  Activity,
  Filter,
  Plus,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Scale,
  MessageSquare,
  X,
  FileText,
  UserPlus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import {
  useTrackingStore,
  TrackingTab,
  WorkloadLevel,
  BlockerItem,
  ActivityEvent,
  EmployeeProfileData,
} from '../store/useTrackingStore';
import {
  getTrackingOverviewData,
  calculateWorkloadLevel,
  reportBlocker,
  resolveBlocker,
} from '../services/trackingService';
import { dispatchNotificationAlert } from '../services/notificationService';

// Color Presets for Recharts
const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#6366F1',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pieColors: ['#22C55E', '#3B82F6', '#F59E0B', '#EF4444'],
};

export default function TeamWorkTracking() {
  const { user } = useAuthStore();
  const { setView, showToast: triggerGlobalToast } = useUIStore();
  const {
    activeTab,
    setActiveTab,
    selectedEmployeeId,
    setSelectedEmployeeId,
    selectedProjectId,
    setSelectedProjectId,
    statusFilter,
    setStatusFilter,
    workloadFilter,
    setWorkloadFilter,
    dateRange,
    setDateRange,
    selectedEmployeeProfile,
    isProfileModalOpen,
    openEmployeeProfile,
    closeEmployeeProfile,
    isReportBlockerModalOpen,
    setIsReportBlockerModalOpen,
  } = useTrackingStore();

  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';
  const navigate = useNavigate();

  // Data states
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeProfileData[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<BlockerItem[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [activeEmpModal, setActiveEmpModal] = useState<EmployeeProfileData | null>(null);

  // Blocker Form State
  const [newBlockerTitle, setNewBlockerTitle] = useState('');
  const [newBlockerDesc, setNewBlockerDesc] = useState('');
  const [newBlockerPriority, setNewBlockerPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [newBlockerTaskId, setNewBlockerTaskId] = useState<number | undefined>(undefined);

  // Resolve Blocker Modal State
  const [resolvingBlockerId, setResolvingBlockerId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Lock background scroll when blocker or profile modals are open
  useScrollLock(isReportBlockerModalOpen || resolvingBlockerId !== null || !!selectedEmployeeProfile || !!activeEmpModal);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    triggerGlobalToast(message, type);
  };

  const handleOpenEmployeeProfile = (employee: EmployeeProfileData) => {
    setActiveEmpModal(employee);
    openEmployeeProfile(employee);
    setView('work-profile');
    navigate(`/employee/${employee.id}/work-profile`);
  };

  const loadData = async () => {
    setLoading(true);
    const data = await getTrackingOverviewData();
    setEmployees(data.employees || []);
    setTasks(data.tasks || []);
    setProjects(data.projects || []);
    setBlockers(data.blockers || []);
    setActivities(data.activities || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isEmployeeRole = user?.role === 'ROLE_EMPLOYEE';

  // Role-scoped tasks: Team leaders track ALL employee tasks; Employees track ONLY their own assigned tasks.
  const scopedTasks = isEmployeeRole
    ? tasks.filter((t) => t.assignee && (t.assignee.id === user?.id || t.assignee.name === user?.name))
    : tasks;

  // Role-scoped employee list: Team leaders track ALL employees; Employees see ONLY their own record.
  const scopedEmployees = isEmployeeRole
    ? employees.filter((emp) => emp.id === user?.id || emp.name === user?.name)
    : employees;

  // Filtered Employees List
  const filteredEmployees = scopedEmployees.filter((emp) => {
    if (workloadFilter !== 'ALL' && emp.workloadLevel !== workloadFilter) return false;
    if (selectedEmployeeId && emp.id !== selectedEmployeeId) return false;
    return true;
  });

  // Calculate Metrics based on role-scoped data
  const totalEmployees = scopedEmployees.length;
  const totalActiveTasks = scopedTasks.filter((t) =>
    ['TO_DO', 'IN_PROGRESS', 'TESTING', 'REVIEW', 'ACCEPTED'].includes(t.status)
  ).length;
  const totalCompletedTasks = scopedTasks.filter((t) => t.status === 'COMPLETED').length;
  const overdueTasksCount = scopedTasks.filter((t) => {
    if (t.status === 'COMPLETED') return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const activeBlockersCount = blockers.filter((b) => {
    if (b.status !== 'ACTIVE') return false;
    if (isEmployeeRole) return b.reporterId === user?.id || b.reporterName === user?.name;
    return true;
  }).length;

  const overallProgress =
    scopedTasks.length > 0 ? Math.round((totalCompletedTasks / scopedTasks.length) * 100) : 100;

  // Recharts Data Transformation
  const weeklyCompletionData = [
    { day: 'Mon', completed: 4, assigned: 6, velocity: 85 },
    { day: 'Tue', completed: 7, assigned: 8, velocity: 90 },
    { day: 'Wed', completed: 5, assigned: 7, velocity: 88 },
    { day: 'Thu', completed: 9, assigned: 9, velocity: 96 },
    { day: 'Fri', completed: 6, assigned: 8, velocity: 92 },
    { day: 'Sat', completed: 3, assigned: 4, velocity: 94 },
    { day: 'Sun', completed: 2, assigned: 2, velocity: 100 },
  ];

  const workloadDistributionData = employees.map((emp) => ({
    name: emp.name,
    assigned: emp.assignedTasksCount,
    inProgress: emp.inProgressTasksCount,
    completed: emp.completedTasksCount,
    overdue: emp.overdueTasksCount,
  }));

  const overduePieData = [
    { name: 'On-Time Completed', value: Math.max(totalCompletedTasks, 1) },
    { name: 'In-Progress Active', value: Math.max(totalActiveTasks, 1) },
    { name: 'Overdue Items', value: Math.max(overdueTasksCount, 0) },
    { name: 'Active Blockers', value: Math.max(activeBlockersCount, 0) },
  ];

  // Blocker Submission Handler
  const handleBlockerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockerTitle.trim() || !newBlockerDesc.trim()) {
      showToast('Please fill in both title and description for the blocker.', 'error');
      return;
    }

    try {
      const reporter = user ? { reporterId: user.id, reporterName: user.name } : { reporterId: 1002, reporterName: 'Rahul' };
      const created = await reportBlocker({
        title: newBlockerTitle,
        description: newBlockerDesc,
        priority: newBlockerPriority,
        taskId: newBlockerTaskId,
        ...reporter,
      });

      dispatchNotificationAlert({
        title: `Technical Blocker Reported: ${newBlockerTitle}`,
        message: `${user?.name || 'Team member'} reported a ${newBlockerPriority} priority blocker: "${newBlockerTitle}".`,
        type: 'BLOCKER_ALERT',
        recipientId: 'ALL'
      });

      showToast(`Blocker "${created.title}" reported successfully!`, 'success');
      setIsReportBlockerModalOpen(false);
      setNewBlockerTitle('');
      setNewBlockerDesc('');
      loadData();
    } catch (err) {
      showToast('Failed to report blocker.', 'error');
    }
  };

  // Blocker Resolution Handler
  const handleResolveBlockerSubmit = async () => {
    if (!resolvingBlockerId) return;
    try {
      await resolveBlocker(resolvingBlockerId, resolutionNotes);

      dispatchNotificationAlert({
        title: `Technical Blocker Resolved by Team Leader`,
        message: `${user?.name || 'Team Leader'} resolved technical blocker #${resolvingBlockerId}.${resolutionNotes ? ` Notes: "${resolutionNotes}"` : ''}`,
        type: 'BLOCKER_ALERT',
        recipientId: 'ALL'
      });

      showToast('Blocker marked as resolved.', 'success');
      setResolvingBlockerId(null);
      setResolutionNotes('');
      loadData();
    } catch (err) {
      showToast('Failed to resolve blocker.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 select-none pb-12 w-full min-w-0 animate-pulse">
        <div className="h-12 w-72 bg-slate-200/80 dark:bg-white/10 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-24 bg-slate-200/80 dark:bg-white/5 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200/80 dark:bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title & Navigation Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              Team Work Tracking & Performance Insights
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Monitor team workload, task completion velocity, project contributions, and reported blockers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsReportBlockerModalOpen(true)}
            className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" /> Report Blocker / Need Help
          </button>

          {isTeamLeader && (
            <button
              onClick={() => setView('tasks')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <CheckSquare className="w-4 h-4" /> Assign Tasks →
            </button>
          )}
        </div>
      </div>

      {/* Surveillance Prevention Assurance Banner */}
      <div className="glass-panel p-3.5 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold">
          <ShieldCheck className="w-4.5 h-4.5 flex-shrink-0" />
          <span>
            <strong>Ethical Work Tracking Enabled:</strong> Monitoring is 100% focused on project deliverables, task completion rates, log hours, and reported blockers. No keystroke, mouse, or screenshot surveillance is active.
          </span>
        </div>
        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          Privacy Assured
        </span>
      </div>

      {/* Tab Navigation & Filters Bar */}
      <div className="glass-panel p-3 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Overview Dashboard', icon: BarChart3 },
            { id: 'blockers', label: 'Blockers & Help', icon: AlertTriangle, count: activeBlockersCount },
            { id: 'activity', label: 'Work Activity Feed', icon: Activity },
            { id: 'comparison', label: 'Team Comparison', icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TrackingTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                    isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workload Level Filter */}
          <div className="relative">
            <select
              value={workloadFilter}
              onChange={(e) => setWorkloadFilter(e.target.value)}
              className="px-3 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold outline-none cursor-pointer text-slate-700 dark:text-slate-300"
            >
              <option value="ALL" className="dark:bg-slate-900">All Workload Levels</option>
              <option value="LOW" className="dark:bg-slate-900">Low Workload</option>
              <option value="BALANCED" className="dark:bg-slate-900">Balanced</option>
              <option value="HIGH" className="dark:bg-slate-900">High Capacity</option>
              <option value="OVERLOADED" className="dark:bg-slate-900">⚠️ Overloaded</option>
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl">
            {['7D', '30D', '90D'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  dateRange === range
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 6 Key Performance Indicator (KPI) Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Team Members</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalEmployees}</p>
              <span className="text-[10px] font-bold text-emerald-500">Active Staff</span>
            </div>

            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Active Tasks</span>
                <CheckSquare className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalActiveTasks}</p>
              <span className="text-[10px] font-bold text-indigo-500">In Progress</span>
            </div>

            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCompletedTasks}</p>
              <span className="text-[10px] font-bold text-emerald-500">Deliverables Done</span>
            </div>

            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Overdue Tasks</span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{overdueTasksCount}</p>
              <span className="text-[10px] font-bold text-rose-500">Requires Attention</span>
            </div>

            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Overall Progress</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{overallProgress}%</p>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Active Blockers</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{activeBlockersCount}</p>
              <span className="text-[10px] font-bold text-amber-500">Need Resolution</span>
            </div>
          </div>

          {/* Visual Analytics Charts Section (Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Weekly Task Velocity Trend */}
            <div className="glass-panel p-5 lg:col-span-2 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" /> Task Completion Velocity Trend
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Weekly task completion output vs assigned items.
                  </p>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-lg">
                  Avg Velocity: 92%
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyCompletionData}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAssigned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                    <Area type="monotone" dataKey="completed" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" name="Completed Tasks" />
                    <Area type="monotone" dataKey="assigned" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorAssigned)" name="Assigned Tasks" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Task Status & Risk Ratio */}
            <div className="glass-panel p-5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-500" /> Work Status & Delivery Ratio
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Distribution of completed vs active vs overdue items.
                </p>
              </div>

              <div className="h-56 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overduePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {overduePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS.pieColors[index % CHART_COLORS.pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        color: '#FFF',
                        fontSize: '12px',
                        fontWeight: 'bold',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900 dark:text-white">{scopedTasks.length}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total Tasks</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold pt-2 border-t border-slate-200/30 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Done: {totalCompletedTasks}
                </div>
                <div className="flex items-center gap-1.5 text-blue-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Active: {totalActiveTasks}
                </div>
                <div className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Blockers: {activeBlockersCount}
                </div>
                <div className="flex items-center gap-1.5 text-rose-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Overdue: {overdueTasksCount}
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: Workload Distribution Bar Chart */}
          <div className="glass-panel p-5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" /> Workload Distribution Across Team Members
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Compare active, completed, and overdue tasks per employee.
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="inProgress" name="In Progress" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EMPLOYEE OVERVIEW TABLE */}
          <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-xl space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-500" /> Team Member Work Overview & Capacity
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Select any employee to inspect their detailed work profile, task contributions, and active blockers.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Team Member</th>
                    <th className="p-3">Role & Dept</th>
                    <th className="p-3 text-center">Assigned</th>
                    <th className="p-3 text-center">In Progress</th>
                    <th className="p-3 text-center">Completed</th>
                    <th className="p-3 text-center">Overdue</th>
                    <th className="p-3 text-center">Completion Rate</th>
                    <th className="p-3 text-center">Workload Level</th>
                    <th className="p-3 text-center">Inspect Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/20 dark:divide-white/5">
                  {filteredEmployees.map((emp) => {
                    const workloadInfo = calculateWorkloadLevel(emp.inProgressTasksCount, emp.overdueTasksCount);
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-500/5 transition-colors font-bold text-slate-700 dark:text-slate-300 group cursor-pointer"
                        onClick={() => handleOpenEmployeeProfile(emp)}
                      >
                        {/* Employee Avatar & Name */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={resolveAvatar(emp.profilePhoto, emp.name, (emp as any).gender)}
                                alt="avatar"
                                className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/20 group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                {emp.name}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400">{emp.currentProject}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-3">
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md uppercase">
                            {emp.designation}
                          </span>
                        </td>

                        {/* Assigned */}
                        <td className="p-3 text-center font-black text-slate-900 dark:text-white">{emp.assignedTasksCount}</td>

                        {/* In Progress */}
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md font-extrabold">
                            {emp.inProgressTasksCount}
                          </span>
                        </td>

                        {/* Completed */}
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md font-extrabold">
                            {emp.completedTasksCount}
                          </span>
                        </td>

                        {/* Overdue */}
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-extrabold ${
                              emp.overdueTasksCount > 0
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                : 'text-slate-400'
                            }`}
                          >
                            {emp.overdueTasksCount}
                          </span>
                        </td>

                        {/* Completion Rate Progress */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${emp.completionRate}%` }} />
                            </div>
                            <span className="text-[10px] font-black">{emp.completionRate}%</span>
                          </div>
                        </td>

                        {/* Workload Level Badge */}
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase ${workloadInfo.badgeColor}`}>
                            {emp.workloadLevel}
                          </span>
                        </td>

                        {/* Inspect Profile Action */}
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEmployeeProfile(emp);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                e.preventDefault();
                                handleOpenEmployeeProfile(emp);
                              }
                            }}
                            tabIndex={0}
                            aria-label={`Inspect Work Profile for ${emp.name}`}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] shadow-xs cursor-pointer transition-all active:scale-95 focus:ring-2 focus:ring-blue-400 outline-none"
                          >
                            Work Profile →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BLOCKERS & HELP NEEDED */}
      {/* ========================================================================= */}
      {activeTab === 'blockers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Active Team Blockers & Help Requests
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Identify and resolve technical bottlenecks preventing team members from completing tasks.
              </p>
            </div>

            <button
              onClick={() => setIsReportBlockerModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" /> Report New Blocker
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blockers.map((blocker) => {
              const isResolved = blocker.status === 'RESOLVED';
              return (
                <div
                  key={blocker.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all space-y-3 ${
                    isResolved
                      ? 'border-emerald-500/30 opacity-70'
                      : 'border-amber-500/40 shadow-md shadow-amber-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${
                            blocker.priority === 'CRITICAL'
                              ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                              : blocker.priority === 'HIGH'
                              ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                              : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                          }`}
                        >
                          {blocker.priority} Priority
                        </span>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            isResolved
                              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {blocker.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{blocker.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-600 dark:text-slate-350 leading-relaxed">
                    {blocker.description}
                  </p>

                  {blocker.taskTitle && (
                    <div className="p-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-blue-500 flex items-center justify-between">
                      <span>Related Task: {blocker.taskTitle}</span>
                    </div>
                  )}

                  {blocker.resolutionNotes && (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <strong>Resolution:</strong> {blocker.resolutionNotes}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200/30 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>Reported by: {blocker.reporterName}</span>
                    {!isResolved && isTeamLeader && (
                      <button
                        onClick={() => setResolvingBlockerId(blocker.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[10px] cursor-pointer transition-all"
                      >
                        ✓ Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORK ACTIVITY FEED */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-6">
          <div>
            <h2 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" /> Real-time Work Activity Timeline
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Live chronological activity stream of task status changes, completed work, comments, and blocker updates.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-white/10">
            {activities.map((act) => (
              <div key={act.id} className="relative space-y-1">
                <span className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">{act.title}</h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 font-medium">{act.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TEAM COMPARISON VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-4">
            <h2 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-500" /> Team Member Comparative Analytics
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Side-by-side comparison of active workload, completion velocity, and overdue risks across the team.
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#22C55E" name="Completed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProgress" fill="#3B82F6" name="In Progress" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" fill="#EF4444" name="Overdue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EMPLOYEE WORK PROFILE DETAILED DRAWER / MODAL */}
      {(activeEmpModal || (isProfileModalOpen && selectedEmployeeProfile)) && (
        <EmployeeWorkProfileModal
          profile={(activeEmpModal || selectedEmployeeProfile)!}
          onClose={() => {
            setActiveEmpModal(null);
            closeEmployeeProfile();
          }}
        />
      )}

      {/* REPORT BLOCKER FORM MODAL */}
      {isReportBlockerModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain select-none">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Report Work Blocker / Request Assistance
              </h3>
              <button onClick={() => setIsReportBlockerModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBlockerSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Blocker Title</label>
                <input
                  type="text"
                  placeholder="e.g. Database connection timeout on staging server"
                  value={newBlockerTitle}
                  onChange={(e) => setNewBlockerTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Priority Level</label>
                <select
                  value={newBlockerPriority}
                  onChange={(e) => setNewBlockerPriority(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="LOW" className="dark:bg-slate-900">Low Priority</option>
                  <option value="MEDIUM" className="dark:bg-slate-900">Medium Priority</option>
                  <option value="HIGH" className="dark:bg-slate-900">High Priority</option>
                  <option value="CRITICAL" className="dark:bg-slate-900">🚨 Critical Blocker</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Detailed Description & Symptoms</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue preventing task progress..."
                  value={newBlockerDesc}
                  onChange={(e) => setNewBlockerDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportBlockerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-md cursor-pointer"
                >
                  Submit Blocker →
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* RESOLVE BLOCKER MODAL */}
      {resolvingBlockerId !== null && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain select-none">
          <div className="w-full max-w-md max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain">
            <h3 className="text-sm font-black text-emerald-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Resolve Blocker
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Provide resolution notes to mark this blocker as resolved.
            </p>
            <textarea
              rows={3}
              placeholder="Resolution details (e.g. Fixed OAuth2 token expiration configuration in Spring Security filter chain)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResolvingBlockerId(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveBlockerSubmit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* WORK PROFILE MODAL */}
      {activeEmpModal && (
        <EmployeeWorkProfileModal
          profile={activeEmpModal}
          onClose={() => setActiveEmpModal(null)}
          onOpenFullPage={() => {
            const empId = activeEmpModal.id;
            setActiveEmpModal(null);
            setView('work-profile');
            navigate(`/employee/${empId}/work-profile`);
          }}
        />
      )}
    </div>
  );
}

{/* STANDALONE EMPLOYEE WORK PROFILE MODAL */}
function EmployeeWorkProfileModal({
  profile,
  onClose,
  onOpenFullPage,
}: {
  profile: EmployeeProfileData;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  // Lock background scroll when Employee Work Profile modal is open
  useScrollLock(!!profile);

  if (!profile) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 touch-none overscroll-contain select-none" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl space-y-5 sm:space-y-6 text-slate-850 dark:text-white select-none modal-dialog-contain overscroll-contain"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200/50 dark:border-white/10 pb-4 gap-3">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <img
              src={resolveAvatar(profile.profilePhoto, profile.name, (profile as any).gender)}
              alt="avatar"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 sm:ring-4 ring-blue-500/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span 
                  className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md font-mono shrink-0 cursor-default" 
                  title={`Full ID: ${profile.id}`}
                >
                  {String(profile.id).length > 10 ? `EMP-${String(profile.id).slice(0, 6)}...` : `EMP-${profile.id}`}
                </span>
                <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                  {profile.name}
                </h2>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg uppercase tracking-wider shrink-0">
                  {profile.designation ? profile.designation.replace(/DEVOLOPER/i, 'Developer') : 'Software Developer'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>Project: <strong className="text-slate-700 dark:text-slate-300">{profile.currentProject}</strong></span>
                <span>•</span>
                <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{profile.department}</strong></span>
                <span>•</span>
                <span>Status: <span className="text-emerald-500 font-bold">{profile.currentStatus || 'ONLINE'}</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {onOpenFullPage && (
              <button
                onClick={onOpenFullPage}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                title="View Full Work Profile Page"
              >
                <span>Full Page</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Overload Warning Alert */}
        {profile.warningMessage && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{profile.warningMessage}</span>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
          <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{profile.assignedTasksCount}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Completed</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-500">{profile.completedTasksCount}</p>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">In Progress</p>
            <p className="text-xl sm:text-2xl font-black text-blue-500">{profile.inProgressTasksCount}</p>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Overdue</p>
            <p className="text-xl sm:text-2xl font-black text-rose-500">{profile.overdueTasksCount}</p>
          </div>
        </div>

        {/* Assigned Tasks Detail List */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/40 dark:border-white/5 pb-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Assigned Tasks ({(profile.tasksList || []).length})</span>
            <span className="text-[11px] font-bold text-blue-500">Completion Rate: {profile.completionRate}%</span>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {(profile.tasksList || []).length > 0 ? (
              (profile.tasksList || []).map((t: any) => (
                <div key={t.id} className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 text-xs hover:border-blue-500/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 dark:text-white truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">Due: {t.dueDate || 'N/A'} • Priority: {t.priority || 'NORMAL'}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl font-black text-[9px] uppercase shrink-0">
                    {(t.status || 'TO_DO').replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center bg-white/5 border border-slate-200/40 dark:border-white/5 rounded-2xl">
                <p className="text-xs text-slate-400 italic">
                  No active tasks assigned to this employee.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Active Reported Blockers */}
        {(profile.blockersList || []).length > 0 && (
          <div className="space-y-2 border-t border-slate-200/30 dark:border-white/10 pt-3">
            <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Reported Blockers ({(profile.blockersList || []).length})
            </h3>
            <div className="space-y-2">
              {(profile.blockersList || []).map((b) => (
                <div key={b.id} className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-black text-slate-900 dark:text-white">
                    <span>{b.title}</span>
                    <span className="text-[9px] text-amber-500 uppercase">{b.priority} PRIORITY</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-350">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
