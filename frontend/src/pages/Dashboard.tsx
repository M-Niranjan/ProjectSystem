import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LayoutDashboard, CheckSquare, Clock, Users, ArrowUpRight, ArrowRight, CloudSun, Calendar, Plus, Shield, Briefcase, Award, AlertCircle, UserCheck, CheckCircle2, XCircle, FileText, ChevronRight, FolderGit2, Sparkles, Activity, Lock, Settings } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { normalizeRole } from '../services/authRoles';

const COLORS = ['#64748B', '#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#22C55E'];

interface DashboardProps {
  forcedRole?: 'ROLE_ADMIN' | 'ROLE_MANAGER' | 'ROLE_EMPLOYEE';
}

export default function Dashboard({ forcedRole }: DashboardProps = {}) {
  const { user } = useAuthStore();
  const { setView } = useUIStore();
  const [time, setTime] = useState(new Date());

  const effectiveRole = forcedRole || normalizeRole(user?.role);
  if (!effectiveRole) return null;

  const isAdmin = effectiveRole === 'ROLE_ADMIN';
  const isTeamLead = effectiveRole === 'ROLE_MANAGER';
  const isEmployee = effectiveRole === 'ROLE_EMPLOYEE';

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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Assign task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('HIGH');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskHours, setNewTaskHours] = useState('8');
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
      if (isEmployee) {
        const tasksRes = await api.get('/api/tasks');
        const allTasksList = tasksRes.data || [];
        const assigned = allTasksList.filter((t: any) => t.assignee && (t.assignee.id === user?.id || t.assignee.name === user?.name));
        setMyTasks(assigned);

        const pending = assigned.filter((t: any) => t.status === 'PENDING_ACCEPTANCE');
        setPendingTasks(pending);

        const completed = assigned.filter((t: any) => t.status === 'COMPLETED').length;
        const total = assigned.length;

        setStats({
          totalProjects: 1,
          activeProjects: 1,
          completedProjects: 0,
          totalTasks: total,
          completedTasks: completed,
          pendingTasks: total - completed,
          productivityScore: total > 0 ? Math.round((completed / total) * 100) : 100
        });

      } else {
        const reportsRes = await api.get('/api/reports/analytics');
        if (reportsRes.data) {
          setStats(prev => ({ ...prev, ...reportsRes.data }));
        }

        const teamsRes = await api.get('/api/teams');
        // System Administrator manages the portal only - filter out ROLE_ADMIN and Niranjan from task assignment directory
        const assignableStaff = (teamsRes.data || []).filter((e: any) => e.role !== 'ROLE_ADMIN' && !e.role?.includes('ADMIN') && e.name !== 'Niranjan');
        setEmployeeDirectory(assignableStaff);
        if (assignableStaff.length > 0) {
          setNewTaskAssigneeId(assignableStaff[0].id.toString());
        }

        const projectsRes = await api.get('/api/projects');
        setProjectsList(projectsRes.data || []);
        if (projectsRes.data.length > 0) {
          setNewTaskProjectId(projectsRes.data[0].id.toString());
        }

        const allTasksRes = await api.get('/api/tasks');
        setAllTasks(allTasksRes.data || []);

        try {
          const auditRes = await api.get('/api/admin/audit-logs');
          setAuditLogs(auditRes.data || []);
        } catch (e) {
          setAuditLogs([]);
        }
      }
    } catch (err) {
      console.log('Error loading dashboard statistics, running mock values.');
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener('task-status-updated', handleUpdate);
    return () => window.removeEventListener('task-status-updated', handleUpdate);
  }, [user]);

  // Employee Accept Task Flow
  const handleAcceptTask = async (taskId: number) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'ACCEPTED', acceptedAt: new Date().toISOString() } : t));

    try {
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.status = 'ACCEPTED';
      await api.put(`/api/tasks/${taskId}`, taskData);
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      loadDashboardData();
    }
  };

  // Employee Submit Task for Review Flow
  const handleSubmitForReview = async (taskId: number) => {
    try {
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.status = 'CODE_REVIEW';
      taskData.submittedForReview = true;
      taskData.reviewStatus = 'PENDING_REVIEW';
      await api.put(`/api/tasks/${taskId}`, taskData);

      // Post audit comment
      await api.post(`/api/tasks/${taskId}/comments`, {
        content: `🚀 [Employee Submission] Task submitted for Code Review by ${user?.name}.`
      });

      window.dispatchEvent(new Event('task-status-updated'));
      loadDashboardData();
    } catch (err) {
      loadDashboardData();
    }
  };

  // Team Lead Assign Task Form Submit
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
        status: 'PENDING_ACCEPTANCE',
        priority: newTaskPriority,
        dueDate: newTaskDueDate || '2026-08-30',
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

  const overdueCount = myTasks.filter(t => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const activeCount = myTasks.filter(t => t.status !== 'COMPLETED').length;

  const weeklyProductivity = [
    { name: 'Mon', completed: 4 },
    { name: 'Tue', completed: 6 },
    { name: 'Wed', completed: 8 },
    { name: 'Thu', completed: 5 },
    { name: 'Fri', completed: 9 },
    { name: 'Sat', completed: 3 },
  ];

  const userDistribution = [
    { name: 'Admins', value: 1 },
    { name: 'Team Leads', value: 1 },
    { name: 'Developers & QA', value: 3 },
  ];

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            {isAdmin ? (
              <><Shield className="w-7 h-7 text-purple-500" /> Admin Dashboard</>
            ) : isTeamLead ? (
              <><Briefcase className="w-7 h-7 text-blue-500" /> Team Lead Dashboard</>
            ) : (
              <><CheckSquare className="w-7 h-7 text-emerald-500" /> Employee Workspace</>
            )}
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, {user?.name}! Roles: <span className="font-extrabold text-blue-500 uppercase">{user?.role.replace('ROLE_', '')}</span>
          </p>
        </div>

        {/* Clock & Weather widgets */}
        <div className="flex items-center gap-3">
          <div className="glass-card-dashboard px-4 py-2 flex items-center gap-2.5 cursor-pointer hover:scale-105 group">
            <CloudSun className="w-5 h-5 text-amber-500 hd-icon-badge" />
            <div className="text-left">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Workspace System</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">Optimal, 22°C</p>
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

      {/* ========================================================================= */}
      {/* 1. ADMIN DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Admin Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total System Users</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">5</h3>
                </div>
                <div className="hd-icon-container bg-purple-500/10 text-purple-500 border-purple-500/20">
                  <Users className="w-5 h-5 hd-icon-badge text-purple-500" />
                </div>
              </div>
              <p className="text-[10px] text-purple-400 font-extrabold mt-3">Full Access & RBAC Active</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Teams</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">3</h3>
                </div>
                <div className="hd-icon-container bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <FolderGit2 className="w-5 h-5 hd-icon-badge text-blue-500" />
                </div>
              </div>
              <p className="text-[10px] text-blue-500 font-bold mt-3">Engineering, QA, Product</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Active Projects</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.activeProjects}</h3>
                </div>
                <div className="hd-icon-container bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Activity className="w-5 h-5 hd-icon-badge text-amber-500" />
                </div>
              </div>
              <p className="text-[10px] text-amber-500 font-bold mt-3">Hospital PM, SaaS, Workflow</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Completed Projects</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completedProjects}</h3>
                </div>
                <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 hd-icon-badge text-emerald-500" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-3">100% On-Time Delivery</p>
            </div>
          </div>

          {/* Admin Navigation Quick Module Grid */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" /> Admin System Modules Navigation
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <button
                onClick={() => setView('users')}
                className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-purple-500/40 text-left transition-all hover:scale-105 cursor-pointer space-y-2"
              >
                <Users className="w-6 h-6 text-purple-500" />
                <p className="text-xs font-black text-slate-800 dark:text-white">User Directory</p>
                <p className="text-[9px] text-slate-400 font-medium">Create & assign roles</p>
              </button>

              <button
                onClick={() => setView('roles')}
                className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-blue-500/40 text-left transition-all hover:scale-105 cursor-pointer space-y-2"
              >
                <Shield className="w-6 h-6 text-blue-500" />
                <p className="text-xs font-black text-slate-800 dark:text-white">Roles & Permissions</p>
                <p className="text-[9px] text-slate-400 font-medium">RBAC matrix settings</p>
              </button>

              <button
                onClick={() => setView('teams')}
                className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-indigo-500/40 text-left transition-all hover:scale-105 cursor-pointer space-y-2"
              >
                <FolderGit2 className="w-6 h-6 text-indigo-500" />
                <p className="text-xs font-black text-slate-800 dark:text-white">Teams Config</p>
                <p className="text-[9px] text-slate-400 font-medium">Assign Team Leads</p>
              </button>

              <button
                onClick={() => setView('organization')}
                className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-amber-500/40 text-left transition-all hover:scale-105 cursor-pointer space-y-2"
              >
                <Settings className="w-6 h-6 text-amber-500" />
                <p className="text-xs font-black text-slate-800 dark:text-white">Org Settings</p>
                <p className="text-[9px] text-slate-400 font-medium">Working hours & defaults</p>
              </button>

              <button
                onClick={() => setView('audit-logs')}
                className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-emerald-500/40 text-left transition-all hover:scale-105 cursor-pointer space-y-2"
              >
                <FileText className="w-6 h-6 text-emerald-500" />
                <p className="text-xs font-black text-slate-800 dark:text-white">Audit Logs</p>
                <p className="text-[9px] text-slate-400 font-medium">Security activity history</p>
              </button>
            </div>
          </div>

          {/* Admin System Audit Stream */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> System Security & Activity Log Feed
              </h3>
              <button onClick={() => setView('audit-logs')} className="text-xs font-bold text-blue-500 hover:underline">View All Logs →</button>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-3">Actor User</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Activity Description</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {auditLogs && auditLogs.length > 0 ? (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-white/5">
                        <td className="p-3 font-black text-slate-800 dark:text-white">{log.user}</td>
                        <td className="p-3 font-extrabold text-blue-500 uppercase text-[10px]">{log.action}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">{log.activity}</td>
                        <td className="p-3 text-slate-400 font-bold text-[10px]">{log.date ? `${log.date} ${log.time || ''}` : log.timestamp || 'N/A'}</td>
                        <td className="p-3 text-right">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                            log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {log.status || 'SUCCESS'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-xs font-semibold text-slate-400">
                        No activity logs recorded yet. Real user actions will appear here automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TEAM LEAD DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {isTeamLead && (
        <div className="space-y-6">
          {/* Team Lead Overview Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Active Projects</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.activeProjects}</h3>
                </div>
                <div className="hd-icon-container bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <FolderGit2 className="w-5 h-5 hd-icon-badge text-blue-500" />
                </div>
              </div>
              <p className="text-[10px] text-blue-500 font-bold mt-3">Hospital System, SaaS, Workflow</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Pending Code Reviews</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">1</h3>
                </div>
                <div className="hd-icon-container bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Award className="w-5 h-5 hd-icon-badge text-amber-500" />
                </div>
              </div>
              <p className="text-[10px] text-amber-500 font-extrabold mt-3">Rahul: Create Patient Dashboard</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Active Tasks</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.totalTasks}</h3>
                </div>
                <div className="hd-icon-container bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                  <CheckSquare className="w-5 h-5 hd-icon-badge text-indigo-500" />
                </div>
              </div>
              <p className="text-[10px] text-indigo-400 font-bold mt-3">2 In Progress • 1 Testing</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Overall Health</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">92%</h3>
                </div>
                <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 hd-icon-badge text-emerald-500" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-3">✓ Optimal Team Velocity</p>
            </div>
          </div>

          {/* Real World Workflow Highlight & Task Review Queue Banner */}
          <div className="glass-panel p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black text-xl flex-shrink-0">
                  🏥
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">Active Real-World Project</span>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 animate-pulse">Code Review Submission</span>
                  </div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white mt-1">Hospital Management System — Create Patient Dashboard</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Submitted by <strong className="text-slate-800 dark:text-white">Rahul (Employee)</strong> for Team Lead approval.</p>
                </div>
              </div>

              <button
                onClick={() => setView('reviews')}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all transform hover:-translate-y-0.5"
              >
                Review & Approve Task <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Employee Directory & Assign Task Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Directory Workload Allocation */}
            <div className="glass-panel p-6 lg:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Team Workload & Allocation
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {employeeDirectory
                  .filter(emp => emp.role !== 'ROLE_ADMIN' && !emp.role?.includes('ADMIN') && emp.name !== 'Niranjan')
                  .map(emp => (
                  <div key={emp.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img src={emp.profilePhoto || getAvatarByName(emp.name)} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">{emp.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{emp.designation || 'Software Engineer'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500">
                        ⚡ 50% Allocated
                      </span>
                      <button
                        onClick={() => {
                          setNewTaskAssigneeId(emp.id.toString());
                        }}
                        className="px-2.5 py-1 bg-white/5 border border-slate-200/50 dark:border-white/10 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                      >
                        + Assign Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Direct Task Assignment Form */}
            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" /> Quick Task Assignment
              </h3>

              {formSuccess && <p className="text-xs text-emerald-500 font-bold">✓ {formSuccess}</p>}
              {formError && <p className="text-xs text-rose-500 font-bold">⚠️ {formError}</p>}

              <form onSubmit={handleAssignTaskSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Task Title (e.g. Patient Dashboard UI)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs outline-none font-semibold"
                />

                <select
                  value={newTaskProjectId}
                  onChange={(e) => setNewTaskProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  {projectsList.map(p => (
                    <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.name}</option>
                  ))}
                </select>

                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-900">Select Assignee...</option>
                  {employeeDirectory
                    .filter(emp => emp.role !== 'ROLE_ADMIN' && !emp.role?.includes('ADMIN') && emp.name !== 'Niranjan')
                    .map(emp => (
                    <option key={emp.id} value={emp.id} className="dark:bg-slate-900">{emp.name} ({emp.designation})</option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Create & Assign Task
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EMPLOYEE DASHBOARD VIEW */}
      {/* ========================================================================= */}
      {isEmployee && (
        <div className="space-y-6">
          {/* Employee Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">My Active Tasks</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{activeCount}</h3>
                </div>
                <div className="hd-icon-container bg-blue-500/10 text-blue-500 border-blue-500/20">
                  <CheckSquare className="w-5 h-5 hd-icon-badge text-blue-500" />
                </div>
              </div>
              <p className="text-[10px] text-blue-500 font-bold mt-3">Hospital & SaaS Tasks</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Pending Acceptance</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{pendingTasks.length}</h3>
                </div>
                <div className="hd-icon-container bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <AlertCircle className="w-5 h-5 hd-icon-badge text-amber-500" />
                </div>
              </div>
              <p className="text-[10px] text-amber-500 font-bold mt-3">Action Required</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Completed Tasks</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completedTasks}</h3>
                </div>
                <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 hd-icon-badge text-emerald-500" />
                </div>
              </div>
              <p className="text-[10px] text-emerald-500 font-bold mt-3">100% Delivery Rate</p>
            </div>

            <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">My Working Hours Today</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">7.5h</h3>
                </div>
                <div className="hd-icon-container bg-purple-500/10 text-purple-500 border-purple-500/20">
                  <Clock className="w-5 h-5 hd-icon-badge text-purple-500" />
                </div>
              </div>
              <p className="text-[10px] text-purple-400 font-bold mt-3">Daily Goal: 8.0h</p>
            </div>
          </div>

          {/* Pending Task Acceptance Alerts */}
          {pendingTasks.length > 0 && (
            <div className="glass-panel p-5 bg-gradient-to-r from-blue-600/15 to-indigo-600/15 border border-blue-500/30 space-y-3">
              <h3 className="text-xs font-black text-blue-500 flex items-center gap-2 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-500 animate-bounce" /> New Task Assignment Alerts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingTasks.map(t => (
                  <div key={t.id} className="glass-panel p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">{t.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{t.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptTask(t.id)}
                        className="flex-1 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                      >
                        ✓ Accept Task
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks & Real-world Workflow Action Table */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-500" /> My Assigned Tasks & Workflow
              </h3>
              <button onClick={() => setView('my-tasks')} className="text-xs font-bold text-blue-500 hover:underline">View All Tasks →</button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {myTasks.map(t => (
                <div key={t.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase border border-blue-500/20">
                        {t.project?.name || 'Hospital Management System'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        t.status === 'CODE_REVIEW' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-blue-500/15 text-blue-500'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white mt-1.5">{t.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    {t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' || t.status === 'TODO' ? (
                      <button
                        onClick={() => handleSubmitForReview(t.id)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        Submit for Review <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : t.status === 'CODE_REVIEW' ? (
                      <span className="text-[10px] font-black px-3 py-1.5 bg-amber-500/15 text-amber-500 rounded-xl border border-amber-500/30 animate-pulse">
                        ⏳ Pending Team Lead Review
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400">✓ Deliverable Passed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard() {
  return <Dashboard forcedRole="ROLE_ADMIN" />;
}

export function TeamLeaderDashboard() {
  return <Dashboard forcedRole="ROLE_MANAGER" />;
}

export function EmployeeDashboard() {
  return <Dashboard forcedRole="ROLE_EMPLOYEE" />;
}
