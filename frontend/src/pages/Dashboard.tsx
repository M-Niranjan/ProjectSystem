import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LayoutDashboard, CheckSquare, Clock, Users, ArrowUpRight, CloudSun, Calendar, Plus, Shield, Briefcase, Award, AlertCircle, UserCheck, CheckCircle2, XCircle, FileText, ChevronRight } from 'lucide-react';
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
    try {
      // Fetch task details
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.status = 'TO_DO'; // Set to TO_DO on acceptance

      await api.put(`/api/tasks/${taskId}`, taskData);
      loadDashboardData();
    } catch (err) {
      console.log('Failed to accept task');
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
    <div className="space-y-6 select-none pb-12">
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
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-500 animate-spin-slow animate-pulse" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Local Weather</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">Sunny, 22°C</p>
            </div>
          </div>

          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Digital Clock</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono">
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
            <div className="glass-panel p-6 flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-4">
                <img
                  src={user?.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`}
                  alt="avatar"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white">{user?.name}</h4>
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest">{user?.designation || 'Employee'}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-1">{user?.department || 'Operations'}</p>
                </div>
              </div>
              <div className="border-t border-slate-200/30 dark:border-white/5 pt-3 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Experience:</strong> {user?.experience || '2'} Years</p>
                <p><strong>Skills:</strong> {user?.skills || 'React, Java'}</p>
              </div>
              <button
                onClick={() => setView('profile')}
                className="w-full text-center py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Go to Profile Settings
              </button>
            </div>

            {/* Workload summary details */}
            <div className="glass-panel p-6 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">My Workload Summary</h4>
                <p className="text-xs text-slate-400 mt-1">Real-time status analysis of your personal pipeline.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 my-4">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 text-center">
                  <h5 className="text-2xl font-black text-blue-500">{activeCount}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Active Tasks</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-center">
                  <h5 className="text-2xl font-black text-red-500">{overdueCount}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Overdue Tasks</p>
                </div>
                <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4 text-center">
                  <h5 className="text-2xl font-black text-green-500">{stats.completedTasks}</h5>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Completed History</p>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
                <span>Productivity Index: {stats.productivityScore}% overall completion rate.</span>
              </div>
            </div>
          </div>

          {/* New Assignment Alerts (Pending Acceptance) */}
          {pendingTasks.length > 0 && (
            <div className="bg-blue-600/15 border border-blue-500/30 rounded-3xl p-6 space-y-4">
              <h3 className="text-base font-black text-blue-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 animate-bounce" /> New Assignment Alerts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="glass-panel p-4 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase">{t.priority}</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mt-2">{t.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                      <p className="text-[9px] text-slate-400 mt-2"><strong>Due:</strong> {t.dueDate} | <strong>Est:</strong> {t.estimatedTime} hrs</p>
                    </div>

                    {declineTargetId === t.id ? (
                      <div className="space-y-2 pt-2 border-t border-slate-200/30 dark:border-white/5">
                        <input
                          type="text"
                          placeholder="Reason for declining task..."
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-lg text-xs outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeclineTask}
                            className="px-3 py-1 bg-red-600 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => setDeclineTargetId(null)}
                            className="px-3 py-1 bg-slate-500 text-white rounded text-[10px] font-black uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptTask(t.id)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Accept Task
                        </button>
                        <button
                          onClick={() => setDeclineTargetId(t.id)}
                          className="py-1.5 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
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

          {/* Today's Work & Task History columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's active checklist */}
            <div className="glass-panel p-5 flex flex-col justify-between">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <Clock className="w-4.5 h-4.5 text-blue-500" /> Today's Focus Work
              </h4>
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                {myTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'PENDING_ACCEPTANCE').length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-6">No tasks currently active.</p>
                ) : (
                  myTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'PENDING_ACCEPTANCE').map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-slate-500/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate flex-1">{t.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase">{t.status}</span>
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase">{t.priority}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* My Task History */}
            <div className="glass-panel p-5 flex flex-col justify-between">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-green-500" /> My Completed History
              </h4>
              <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
                {myTasks.filter(t => t.status === 'COMPLETED').length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-6">No completed tasks yet.</p>
                ) : (
                  myTasks.filter(t => t.status === 'COMPLETED').map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2.5 bg-green-500/5 rounded-xl border border-green-500/10">
                      <span className="font-bold text-slate-400 line-through truncate flex-1">{t.title}</span>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 uppercase">Completed</span>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-panel p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Projects</p>
                <h3 className="text-3xl font-black mt-2 text-slate-800 dark:text-white">{stats.totalProjects}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Active Projects</p>
                <h3 className="text-3xl font-black mt-2 text-slate-800 dark:text-white">{stats.activeProjects}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Pending Tasks</p>
                <h3 className="text-3xl font-black mt-2 text-slate-800 dark:text-white">{stats.pendingTasks}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-panel p-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Productivity</p>
                <h3 className="text-3xl font-black mt-2 text-slate-800 dark:text-white">{stats.productivityScore}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center animate-pulse">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Directory & Assign Panel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Employee Directory */}
            <div className="glass-panel p-5 lg:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4.5 h-4.5 text-blue-500" /> Employee Directory
                </h4>
                <p className="text-xs text-slate-400 mt-1">Directory of active resources and workload distribution.</p>
              </div>

              <div className="my-4 divide-y divide-slate-200/20 max-h-[300px] overflow-y-auto pr-1">
                {employeeDirectory.map(emp => (
                  <div key={emp.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${emp.name}`}
                        alt="avatar"
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-blue-500/10"
                      />
                      <div>
                        <p className="font-black text-xs text-slate-850 dark:text-slate-100">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{emp.designation || 'Staff'} ({emp.department || 'Tech'})</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-black">
                      {emp.role === 'ROLE_EMPLOYEE' ? 'Employee' : 'Team Lead'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assign Task Panel Form */}
            {!isEmployee && (
              <div className="glass-panel p-5">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-500" /> Assign Task Panel
                </h4>
                <form onSubmit={handleAssignTaskSubmit} className="space-y-3.5 mt-3.5">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Task Title</label>
                    <input
                      type="text"
                      placeholder="Fix login UI bug..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs outline-none focus:border-blue-500/50 transition-all font-semibold"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Project</label>
                      <select
                        value={newTaskProjectId}
                        onChange={(e) => setNewTaskProjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs outline-none font-semibold"
                      >
                        {projectsList.map(p => (
                          <option className="dark:bg-slate-800 text-slate-700" key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Assignee</label>
                      <select
                        value={newTaskAssigneeId}
                        onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs outline-none font-semibold"
                      >
                        <option className="dark:bg-slate-800 text-slate-700" value="">-- Select --</option>
                        {employeeDirectory.filter(u => u.role === 'ROLE_EMPLOYEE').map(emp => (
                          <option className="dark:bg-slate-800 text-slate-700" key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Due Date</label>
                      <input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-[10px] outline-none font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Hours</label>
                      <input
                        type="number"
                        value={newTaskHours}
                        onChange={(e) => setNewTaskHours(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-[10px] outline-none font-semibold"
                      />
                    </div>
                  </div>

                  {formSuccess && <p className="text-[10px] text-green-500 font-bold">{formSuccess}</p>}
                  {formError && <p className="text-[10px] text-red-500 font-bold">{formError}</p>}

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Send Task (Pending Acceptance)
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Acceptance Tracker & Cumulative progress rows */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Acceptance Tracker list */}
            <div className="glass-panel p-5 lg:col-span-2">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4.5 h-4.5 text-blue-500" /> Acceptance Tracker
              </h4>
              <p className="text-xs text-slate-400 mt-1">Real-time tracker of tasks pending approval or accepted by staff.</p>

              <div className="my-4 divide-y divide-slate-200/20 max-h-[220px] overflow-y-auto pr-1">
                {allTasks.filter(t => t.status === 'PENDING_ACCEPTANCE').length === 0 ? (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-8">All assigned tasks accepted or resolved.</p>
                ) : (
                  allTasks.filter(t => t.status === 'PENDING_ACCEPTANCE').map(task => (
                    <div key={task.id} className="flex items-center justify-between py-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{task.title}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">Assigned to: {task.assignee ? task.assignee.name : 'Unassigned'}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded animate-pulse">
                        Pending Acceptance
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Team Analytics */}
            <div className="glass-panel p-5">
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5">
                <FileText className="w-4.5 h-4.5 text-blue-500" /> Cumulative Output
              </h4>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyProgress}>
                    <XAxis dataKey="name" hide />
                    <Area type="monotone" dataKey="rate" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center mt-2">
                Workspace performance velocity: Stable at {stats.productivityScore}% completion rate.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
