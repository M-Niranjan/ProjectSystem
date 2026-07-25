import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LayoutDashboard, CheckSquare, Clock, Users, ArrowUpRight, ArrowRight, CloudSun, Calendar, Plus, Shield, Briefcase, Award, AlertCircle, UserCheck, CheckCircle2, XCircle, FileText, ChevronRight, FolderGit2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

const COLORS = ['#64748B', '#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#22C55E'];

export default function Dashboard() {
  const { user } = useAuthStore();
  const { setView } = useUIStore();
  const [time, setTime] = useState(new Date());
  
  // Shared state
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    productivityScore: 100,
  });

  // Employee specific state
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [declineTargetId, setDeclineTargetId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Manager specific state
  const [employeeDirectory, setEmployeeDirectory] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  
  // Assign task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('4');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      if (user?.role === 'ROLE_EMPLOYEE') {
        // Fetch employee tasks
        const tasksRes = await api.get('/api/tasks');
        const allTasksList = tasksRes.data || [];
        
        // Filter tasks assigned to logged-in employee
        const assigned = allTasksList.filter((t: any) => t.assignee && t.assignee.id === user.id);
        setMyTasks(assigned);

        // Filter pending acceptance
        const pending = assigned.filter((t: any) => t.status === 'PENDING_ACCEPTANCE');
        setPendingTasks(pending);

        const completed = assigned.filter((t: any) => t.status === 'COMPLETED').length;
        const total = assigned.length;
        const active = total - completed;

        setStats({
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: active,
          productivityScore: total > 0 ? Math.round((completed / total) * 100) : 100
        });

      } else {
        // Fetch manager reports, employee list, and project lists
        const reportsRes = await api.get('/api/reports/analytics');
        if (reportsRes.data) {
          setStats(reportsRes.data);
        }

        const teamsRes = await api.get('/api/teams');
        setEmployeeDirectory(teamsRes.data || []);

        const projectsRes = await api.get('/api/projects');
        setProjectsList(projectsRes.data || []);
        if (projectsRes.data.length > 0) {
          setNewTaskProjectId(projectsRes.data[0].id.toString());
        }

        const allTasksRes = await api.get('/api/tasks');
        setAllTasks(allTasksRes.data || []);
      }
    } catch (err) {
      console.log('Error loading dashboard statistics, running mock values.');
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => {
      loadDashboardData();
    };
    window.addEventListener('task-status-updated', handleUpdate);
    return () => {
      window.removeEventListener('task-status-updated', handleUpdate);
    };
  }, [user]);

  // Accept Task Flow
  const handleAcceptTask = async (taskId: number) => {
    // Optimistic UI: instantly remove from pending list and add to active
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'ACCEPTED', acceptedAt: new Date().toISOString() } : t));

    try {
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;

      // Guard: already accepted — skip
      if (taskData.status === 'ACCEPTED' || taskData.status === 'TO_DO' || taskData.status === 'IN_PROGRESS') {
        return;
      }

      taskData.status = 'ACCEPTED';
      await api.put(`/api/tasks/${taskId}`, taskData);
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      console.log('Failed to accept task — reverting UI');
      loadDashboardData(); // Re-sync on failure
    }
  };

  // Decline Task Flow
  const handleDeclineTask = async () => {
    if (!declineTargetId || !declineReason.trim()) return;
    try {
      // 1. Post Decline Reason Comment
      const commentPayload = {
        content: `🚨 [System Log] Task Declined by ${user?.name}. Reason: ${declineReason}`
      };
      await api.post(`/api/tasks/${declineTargetId}/comments`, commentPayload);

      // 2. Unassign and Revert Task
      const taskRes = await api.get(`/api/tasks/${declineTargetId}`);
      const taskData = taskRes.data;
      taskData.status = 'BACKLOG'; // Revert back to Backlog
      taskData.assignee = null;   // Remove assignee

      await api.put(`/api/tasks/${declineTargetId}`, taskData);
      
      // Cleanup UI state
      setDeclineTargetId(null);
      setDeclineReason('');
      loadDashboardData();
    } catch (err) {
      console.log('Failed to decline task');
    }
  };

  // Assign Task Panel Submit
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');

    if (!newTaskTitle.trim() || !newTaskProjectId || !newTaskAssigneeId) {
      setFormError('Please fill in title, project, and assignee.');
      return;
    }

    try {
      const payload = {
        title: newTaskTitle,
        description: newTaskDesc,
        status: 'PENDING_ACCEPTANCE', // Created as pending acceptance
        priority: newTaskPriority,
        dueDate: newTaskDueDate || '2026-07-20',
        estimatedTime: parseFloat(newTaskHours),
        project: { id: parseInt(newTaskProjectId) },
        assignee: { id: parseInt(newTaskAssigneeId) }
      };

      await api.post('/api/tasks', payload);
      setFormSuccess('Task successfully assigned!');
      setNewTaskTitle('');
      setNewTaskDesc('');
      loadDashboardData();
    } catch (err) {
      setFormError('Failed to save and assign task.');
    }
  };

  const isEmployee = user?.role === 'ROLE_EMPLOYEE';

  // Workload analysis stats for employee
  const overdueCount = myTasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const activeCount = myTasks.filter(t => t.status !== 'COMPLETED').length;

  // Mock data for charts
  const weeklyProductivity = [
    { name: 'Mon', completed: 4 },
    { name: 'Tue', completed: 6 },
    { name: 'Wed', completed: 8 },
    { name: 'Thu', completed: 5 },
    { name: 'Fri', completed: 9 },
    { name: 'Sat', completed: 3 },
    { name: 'Sun', completed: 2 },
  ];

  const monthlyProgress = [
    { name: 'Jan', rate: 45 },
    { name: 'Feb', rate: 58 },
    { name: 'Mar', rate: 62 },
    { name: 'Apr', rate: 70 },
    { name: 'May', rate: 75 },
    { name: 'Jun', rate: 82 },
    { name: 'Jul', rate: stats.productivityScore },
  ];

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            {isEmployee ? 'Worker Dashboard' : 'Manager Dashboard'}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, {user?.name}! Here is your workspace summary.
          </p>
        </div>

        {/* Clock & Weather widgets */}
        <div className="flex items-center gap-3">
          <div className="glass-card-dashboard px-4 py-2 flex items-center gap-2.5 cursor-pointer hover:scale-105 group">
            <CloudSun className="w-5 h-5 text-amber-500 hd-icon-badge" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Local Weather</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">Sunny, 22°C</p>
            </div>
          </div>

          <div className="glass-card-dashboard px-4 py-2 flex items-center gap-2.5 cursor-pointer hover:scale-105 group">
            <Clock className="w-5 h-5 text-blue-500 hd-icon-badge" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Digital Clock</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isEmployee ? (
        /* ==================== EMPLOYEE VIEW ==================== */
        <div className="space-y-6">
          {/* Top Row: Profile Card & Workload Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* My Profile widget */}
            <div className="glass-card-dashboard p-6 flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={user?.profilePhoto || getAvatarByName(user?.name)}
                  alt="avatar"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                />
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">{user?.name}</h4>
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{user?.designation || 'Employee'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-extrabold mt-1">{user?.department || 'Operations'}</p>
                </div>
              </div>
              <div className="border-t border-slate-200/50 dark:border-white/10 pt-3 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
                <p><strong className="font-extrabold text-slate-900 dark:text-white">Email:</strong> {user?.email}</p>
                <p><strong className="font-extrabold text-slate-900 dark:text-white">Experience:</strong> {user?.experience || '2'} Years</p>
                <p><strong className="font-extrabold text-slate-900 dark:text-white">Skills:</strong> {user?.skills || 'React, Java'}</p>
              </div>
              <button
                onClick={() => setView('profile')}
                className="w-full text-center py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:scale-[1.02]"
              >
                Go to Profile Settings
              </button>
            </div>

            {/* Workload summary details */}
            <div className="glass-card-dashboard p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">My Workload Summary</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Real-time status analysis of your personal pipeline.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center hover:scale-105 transition-all">
                  <h5 className="text-2xl font-black text-blue-600 dark:text-blue-400">{activeCount}</h5>
                  <p className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mt-1">Active Tasks</p>
                </div>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center hover:scale-105 transition-all">
                  <h5 className="text-2xl font-black text-rose-600 dark:text-rose-400">{overdueCount}</h5>
                  <p className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mt-1">Overdue Tasks</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center hover:scale-105 transition-all">
                  <h5 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completedTasks}</h5>
                  <p className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase mt-1">Completed History</p>
                </div>
              </div>
              <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
                <span>Productivity Index: {stats.productivityScore}% overall completion rate.</span>
              </div>
            </div>
          </div>

          {/* New Assignment Alerts (Pending Acceptance) */}
          {pendingTasks.length > 0 && (
            <div className="bg-blue-600/15 border border-blue-500/30 rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-xl">
              <h3 className="text-base font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 animate-bounce text-amber-500" /> New Assignment Alerts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="glass-card-dashboard p-4 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase border border-blue-500/30">{t.priority}</span>
                      <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mt-2">{t.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-2 font-bold"><strong>Due:</strong> {t.dueDate} | <strong>Est:</strong> {t.estimatedTime} hrs</p>
                    </div>

                    {declineTargetId === t.id ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-white/10">
                        <input
                          type="text"
                          placeholder="Reason for declining task..."
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/70 dark:bg-slate-900/80 border border-slate-300 dark:border-white/20 rounded-xl text-xs outline-none font-semibold"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeclineTask}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer shadow-sm"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => setDeclineTargetId(null)}
                            className="px-3 py-1.5 bg-slate-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptTask(t.id)}
                          className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          Accept Task
                        </button>
                        <button
                          onClick={() => setDeclineTargetId(t.id)}
                          className="py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Tasks & Completed History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card-dashboard p-5">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-blue-500" /> Active Assigned Tasks ({myTasks.filter(t => t.status !== 'COMPLETED').length})
              </h4>
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                {myTasks.filter(t => t.status !== 'COMPLETED').length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-6">No active tasks in progress.</p>
                ) : (
                  myTasks.filter(t => t.status !== 'COMPLETED').map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-white/40 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/10 hover:border-blue-500/30 transition-all">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate flex-1">{t.title}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 uppercase">{t.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card-dashboard p-5">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /> My Completed History
              </h4>
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                {myTasks.filter(t => t.status === 'COMPLETED').length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-6">No completed tasks yet.</p>
                ) : (
                  myTasks.filter(t => t.status === 'COMPLETED').map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <span className="font-bold text-xs text-slate-500 dark:text-slate-400 line-through truncate flex-1">{t.title}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase">Completed</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== TEAM LEADER VIEW ==================== */
        <div className="space-y-6">
          {/* Managers Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Stat Card 1: Total Projects */}
            <div className="glass-card-dashboard p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Projects</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center hd-icon-badge shadow-lg shadow-blue-500/25">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalProjects}</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  +12.5% this month
                </span>
              </div>
            </div>

            {/* Stat Card 2: Active Projects */}
            <div className="glass-card-dashboard p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Projects</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center hd-icon-badge shadow-lg shadow-indigo-500/25">
                  <FolderGit2 className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.activeProjects}</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  4 teams active
                </span>
              </div>
            </div>

            {/* Stat Card 3: Pending Tasks */}
            <div className="glass-card-dashboard p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Tasks</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white flex items-center justify-center hd-icon-badge shadow-lg shadow-violet-500/25">
                  <CheckSquare className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.pendingTasks}</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  Awaiting review
                </span>
              </div>
            </div>

            {/* Stat Card 4: Productivity Index */}
            <div className="glass-card-dashboard p-6 flex flex-col justify-between cursor-pointer group relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Productivity Score</span>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center hd-icon-badge shadow-lg shadow-emerald-500/25">
                  <Award className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.productivityScore}%</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  98.4% efficiency
                </span>
              </div>
            </div>
          </div>

          {/* Directory & Assign Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Employee Directory */}
            <div className="glass-card-dashboard p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500 hd-icon-badge" /> Employee Directory
                  </h4>
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {employeeDirectory.length} Active Staff
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Directory of active team members and current task assignments.</p>
              </div>

              <div className="my-4 divide-y divide-slate-200/50 dark:divide-white/10 max-h-[320px] overflow-y-auto pr-1">
                {employeeDirectory.map(emp => {
                  const empActiveTasksCount = allTasks.filter(t => t.assignee?.id === emp.id && t.status !== 'COMPLETED').length;
                  return (
                    <div key={emp.id} className="flex items-center justify-between py-3 px-3 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3.5">
                        <div className="relative">
                          <img
                            src={emp.profilePhoto || getAvatarByName(emp.name)}
                            alt="avatar"
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                        </div>
                        <div>
                          <p className="font-black text-xs text-slate-900 dark:text-slate-100">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase mt-0.5">{emp.designation || 'Staff'} ({emp.department || 'Tech'})</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold border ${
                          empActiveTasksCount > 0 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          ⚡ {empActiveTasksCount} Tasks Active
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskAssigneeId(emp.id.toString());
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-white/10 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-[10px] transition-all cursor-pointer shadow-xs"
                        >
                          + Assign
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assign Task Panel Form */}
            {!isEmployee && (
              <div className="glass-card-dashboard p-6">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-500 hd-icon-badge" /> Assign Task Panel
                </h4>
                <form onSubmit={handleAssignTaskSubmit} className="space-y-3.5 mt-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">Task Title</label>
                    <input
                      type="text"
                      placeholder="Fix login UI bug..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white/80 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 rounded-2xl text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-semibold text-slate-900 dark:text-white placeholder-slate-400 shadow-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">Project</label>
                      <select
                        value={newTaskProjectId}
                        onChange={(e) => setNewTaskProjectId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/80 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 rounded-2xl text-xs outline-none font-semibold text-slate-900 dark:text-white cursor-pointer shadow-sm"
                      >
                        {projectsList.map(p => (
                          <option className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white" key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">Assignee</label>
                      <select
                        value={newTaskAssigneeId}
                        onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/80 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 rounded-2xl text-xs outline-none font-semibold text-slate-900 dark:text-white cursor-pointer shadow-sm"
                      >
                        <option className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white" value="">-- Select --</option>
                        {employeeDirectory.filter(u => u.role === 'ROLE_EMPLOYEE').map(emp => (
                          <option className="dark:bg-slate-800 text-slate-700" key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/80 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 rounded-2xl text-xs outline-none font-semibold text-slate-900 dark:text-white shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 block mb-1">Hours</label>
                      <input
                        type="number"
                        value={newTaskHours}
                        onChange={(e) => setNewTaskHours(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/80 dark:bg-slate-900/90 border border-slate-300 dark:border-white/20 rounded-2xl text-xs outline-none font-semibold text-slate-900 dark:text-white shadow-sm"
                      />
                    </div>
                  </div>

                  {formSuccess && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">{formSuccess}</p>}
                  {formError && <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">{formError}</p>}

                  <button
                    type="submit"
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xl shadow-blue-500/25 hover:scale-[1.02] flex items-center justify-between"
                  >
                    <span>Send Task (Pending Acceptance)</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Acceptance Tracker & Cumulative progress rows */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Acceptance Tracker list */}
            <div className="glass-card-dashboard p-6 lg:col-span-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500 hd-icon-badge" /> Acceptance Tracker
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Real-time tracker of tasks pending, accepted, or declined by staff.</p>

              <div className="my-4 divide-y divide-slate-200/50 dark:divide-white/10 max-h-[300px] overflow-y-auto pr-1 space-y-1">
                {allTasks.filter(t => t.status === 'PENDING_ACCEPTANCE' || t.status === 'ACCEPTED' || t.acceptedAt || t.status === 'DECLINED' || Boolean(t.declineReason)).length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-8">No task acceptance records currently active.</p>
                ) : (
                  allTasks.filter(t => t.status === 'PENDING_ACCEPTANCE' || t.status === 'ACCEPTED' || t.acceptedAt || t.status === 'DECLINED' || Boolean(t.declineReason)).map(task => {
                    const isAccepted = task.status === 'ACCEPTED' || Boolean(task.acceptedAt);
                    const isDeclined = task.status === 'DECLINED' || (Boolean(task.declineReason) && task.status === 'BACKLOG');
                    const isPending = task.status === 'PENDING_ACCEPTANCE';
                    
                    let employeeName = task.assignee ? task.assignee.name : 'Employee';
                    let reasonContent = task.declineReason || '';
                    if (!task.assignee && task.declineReason && task.declineReason.includes(':')) {
                      const parts = task.declineReason.split(':');
                      employeeName = parts[0].trim();
                      reasonContent = parts.slice(1).join(':').trim();
                    }

                    return (
                      <div key={task.id} className="flex items-start justify-between py-3 px-3 rounded-2xl hover:bg-white/50 dark:hover:bg-white/5 transition-all gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 dark:text-slate-100 text-xs truncate">{task.title}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold mt-0.5">
                            👤 {employeeName}
                          </p>

                          {/* Accepted timestamp */}
                          {isAccepted && task.acceptedAt && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-0.5">
                              ✓ Accepted at {new Date(task.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(task.acceptedAt).toLocaleDateString()}
                            </p>
                          )}

                          {/* Declined Reason */}
                          {isDeclined && reasonContent && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold mt-0.5">
                              ❌ Reason: <span className="text-slate-800 dark:text-slate-200 font-semibold">{reasonContent}</span>
                            </p>
                          )}

                          {/* Next Action */}
                          {isAccepted && (
                            <p className="text-[9px] text-blue-500 font-bold mt-0.5">Next: Member to begin work</p>
                          )}
                          {isPending && (
                            <p className="text-[9px] text-amber-500 font-bold mt-0.5">Next: Awaiting employee response</p>
                          )}
                          {isDeclined && (
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Next: Reassign or revise task requirements</p>
                          )}
                        </div>

                        {/* Status Badges */}
                        {isPending ? (
                          <span className="px-3 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase rounded-full animate-pulse flex-shrink-0 border border-amber-500/30">
                            ⏳ Pending
                          </span>
                        ) : isAccepted ? (
                          <span className="px-3 py-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase rounded-full flex-shrink-0 border border-emerald-500/30">
                            ✓ Accepted
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase rounded-full flex-shrink-0 border border-rose-500/30">
                            ❌ Declined
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team Analytics */}
            <div className="glass-card-dashboard p-6">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500 hd-icon-badge" /> Cumulative Output
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyProgress}>
                    <XAxis dataKey="name" hide />
                    <Area type="monotone" dataKey="rate" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-center mt-2">
                Workspace performance velocity: Stable at {stats.productivityScore}% completion rate.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
