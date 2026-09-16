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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            {isAdmin ? (
              <><Shield className="w-5 h-5 sm:w-7 sm:h-7 text-purple-500 flex-shrink-0" /> Admin Dashboard</>
            ) : isTeamLead ? (
              <><Briefcase className="w-5 h-5 sm:w-7 sm:h-7 text-blue-500 flex-shrink-0" /> Team Lead Dashboard</>
            ) : (
              <><CheckSquare className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-500 flex-shrink-0" /> Employee Workspace</>
            )}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            Welcome back, <span className="text-slate-700 dark:text-slate-300 font-bold">{user?.name}</span>! Roles: <span className="font-extrabold text-blue-500 uppercase">{user?.role.replace('ROLE_', '')}</span>
          </p>
        </div>

        {/* Clock & Weather widgets */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full sm:w-auto">
          <div className="glass-card-dashboard px-3 sm:px-4 py-2 flex items-center gap-2 cursor-pointer hover:scale-105 group min-w-0">
            <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 hd-icon-badge flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-wider truncate">Workspace System</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">Optimal, 22°C</p>
            </div>
          </div>

          <div className="glass-card-dashboard px-3 sm:px-4 py-2 flex items-center gap-2 cursor-pointer hover:scale-105 group min-w-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 hd-icon-badge flex-shrink-0" />
            <div className="text-left min-w-0">
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-extrabold uppercase tracking-wider truncate">Digital Clock</p>
              <p className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono truncate">
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
        <div className="space-y-4 sm:space-y-6 w-full min-w-0">
          {/* Admin Metric Cards with Left-Top Icons & Cool Glassmorphism */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full min-w-0">
            {/* Card 1: Total System Users */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_16px_36px_-6px_rgba(168,85,247,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex-shrink-0">
                  RBAC
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Total Users</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">5</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-purple-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse flex-shrink-0"></span>
                  <span className="truncate">RBAC Active</span>
                </p>
              </div>
            </div>

            {/* Card 2: Total Teams */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_16px_36px_-6px_rgba(59,130,246,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <FolderGit2 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex-shrink-0">
                  Teams
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Total Teams</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">3</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                  <span className="truncate">Engineering, QA</span>
                </p>
              </div>
            </div>

            {/* Card 3: Active Projects */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_16px_36px_-6px_rgba(245,158,11,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex-shrink-0">
                  Live
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Active Projects</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.activeProjects}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-amber-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                  <span className="truncate">Hospital, SaaS</span>
                </p>
              </div>
            </div>

            {/* Card 4: Completed Projects */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_16px_36px_-6px_rgba(16,185,129,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex-shrink-0">
                  Done
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Completed</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.completedProjects}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  <span className="truncate">On-Time Delivery</span>
                </p>
              </div>
            </div>
          </div>

          {/* Admin Navigation Quick Module Grid */}
          <div className="glass-panel p-4 sm:p-6 space-y-4 sm:space-y-5 rounded-2xl sm:rounded-3xl w-full min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" /> Admin System Modules Navigation
              </h3>
              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Quick Actions</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4 w-full min-w-0">
              {/* 1: User Directory */}
              <button
                onClick={() => setView('users')}
                className="glass-card-dashboard group p-3.5 sm:p-4.5 rounded-xl sm:rounded-[22px] flex flex-col justify-between text-left cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-red-500/40 hover:shadow-[0_14px_32px_-6px_rgba(239,68,68,0.22)] w-full min-w-0"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src="/user-directory-icon.png" alt="User Directory" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-red-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="mt-3 sm:mt-4 space-y-0.5 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-red-500 transition-colors truncate">User Directory</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Create & assign roles</p>
                </div>
              </button>

              {/* 2: Roles & Perms */}
              <button
                onClick={() => setView('roles')}
                className="glass-card-dashboard group p-3.5 sm:p-4.5 rounded-xl sm:rounded-[22px] flex flex-col justify-between text-left cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_14px_32px_-6px_rgba(59,130,246,0.22)] w-full min-w-0"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src="/roles-perms-icon.png" alt="Role & perms" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="mt-3 sm:mt-4 space-y-0.5 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-blue-500 transition-colors truncate">Roles & Perms</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">RBAC matrix</p>
                </div>
              </button>

              {/* 3: Org Settings */}
              <button
                onClick={() => setView('organization')}
                className="glass-card-dashboard group p-3.5 sm:p-4.5 rounded-xl sm:rounded-[22px] flex flex-col justify-between text-left cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-slate-500/40 hover:shadow-[0_14px_32px_-6px_rgba(100,116,139,0.22)] w-full min-w-0"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src="/org-settings-icon.png" alt="Org Settings" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="mt-3 sm:mt-4 space-y-0.5 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate">Org Settings</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Working defaults</p>
                </div>
              </button>

              {/* 4: Team Config */}
              <button
                onClick={() => setView('teams')}
                className="glass-card-dashboard group p-3.5 sm:p-4.5 rounded-xl sm:rounded-[22px] flex flex-col justify-between text-left cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_14px_32px_-6px_rgba(99,102,241,0.22)] w-full min-w-0"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src="/team-config-icon.png" alt="Team Config" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="mt-3 sm:mt-4 space-y-0.5 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-400 transition-colors truncate">Teams Config</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Assign Team Leads</p>
                </div>
              </button>

              {/* 5: Audit Logs */}
              <button
                onClick={() => setView('audit-logs')}
                className="col-span-2 sm:col-span-1 md:col-span-1 glass-card-dashboard group p-3.5 sm:p-4.5 rounded-xl sm:rounded-[22px] flex flex-row sm:flex-col justify-between items-center sm:items-start text-left cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_14px_32px_-6px_rgba(16,185,129,0.22)] w-full min-w-0"
              >
                <div className="flex items-center sm:items-start justify-between sm:w-full gap-3 sm:gap-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <img src="/audit-icon.png" alt="Audit Logs" className="w-full h-full object-contain drop-shadow-sm" />
                  </div>
                  <div className="sm:hidden min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate">Audit Logs</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Security activity history</p>
                  </div>
                  <ArrowUpRight className="hidden sm:block w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all flex-shrink-0" />
                </div>
                <div className="hidden sm:block mt-3 sm:mt-4 space-y-0.5 min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-400 transition-colors truncate">Audit Logs</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Security history</p>
                </div>
                <ArrowUpRight className="sm:hidden w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-all flex-shrink-0" />
              </button>
            </div>
          </div>

          {/* Admin System Audit Stream */}
          <div className="glass-panel p-4 sm:p-6 space-y-4 rounded-2xl sm:rounded-3xl w-full min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 min-w-0">
                <img src="/audit-icon.png" alt="Audit" className="w-5 h-5 object-contain flex-shrink-0" /> 
                <span className="truncate">System Security & Activity Log Feed</span>
              </h3>
              <button onClick={() => setView('audit-logs')} className="text-xs font-bold text-blue-500 hover:underline flex-shrink-0">View All →</button>
            </div>

            {/* Mobile View: Clean Card Feed */}
            <div className="block md:hidden space-y-2.5">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{log.user}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                        log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {log.status || 'SUCCESS'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{log.activity}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="font-extrabold text-blue-500 uppercase">{log.action}</span>
                      <span>{log.date ? `${log.date} ${log.time || ''}` : log.timestamp || 'Just now'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs font-semibold text-slate-400 bg-white/5 border border-dashed border-white/10 rounded-xl">
                  No activity logs recorded yet. Real user actions will appear here automatically.
                </div>
              )}
            </div>

            {/* Desktop View: Full Responsive Table */}
            <div className="hidden md:block overflow-x-auto w-full">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full min-w-0">
            {/* Card 1: Active Projects */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_16px_36px_-6px_rgba(59,130,246,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <FolderGit2 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex-shrink-0">
                  Active
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Active Projects</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.activeProjects}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                  <span className="truncate">Hospital System</span>
                </p>
              </div>
            </div>

            {/* Card 2: Pending Code Reviews */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_16px_36px_-6px_rgba(245,158,11,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <Award className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex-shrink-0">
                  Review
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Code Reviews</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">1</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-amber-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                  <span className="truncate">Patient Dashboard</span>
                </p>
              </div>
            </div>

            {/* Card 3: Total Active Tasks */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_16px_36px_-6px_rgba(99,102,241,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <CheckSquare className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider flex-shrink-0">
                  Tasks
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Active Tasks</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalTasks}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-indigo-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
                  <span className="truncate">2 In Progress</span>
                </p>
              </div>
            </div>

            {/* Card 4: Overall Health */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_16px_36px_-6px_rgba(16,185,129,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex-shrink-0">
                  Health
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Sprint Health</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">98%</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  <span className="truncate">Optimal Performance</span>
                </p>
              </div>
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
          {/* Employee Top Metric Cards with Left-Top Icons & Cool Glassmorphism */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6 w-full min-w-0">
            {/* Card 1: My Active Tasks */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-[0_16px_36px_-6px_rgba(59,130,246,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <CheckSquare className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider flex-shrink-0">
                  Active
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">My Active Tasks</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeCount}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                  <span className="truncate">Hospital & SaaS</span>
                </p>
              </div>
            </div>

            {/* Card 2: Pending Acceptance */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_16px_36px_-6px_rgba(245,158,11,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex-shrink-0">
                  Pending
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Pending Tasks</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pendingTasks.length}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-amber-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
                  <span className="truncate">Action Required</span>
                </p>
              </div>
            </div>

            {/* Card 3: Completed Tasks */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_16px_36px_-6px_rgba(16,185,129,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider flex-shrink-0">
                  Done
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Completed</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.completedTasks}</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-emerald-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  <span className="truncate">100% Delivery</span>
                </p>
              </div>
            </div>

            {/* Card 4: Efficiency Rate */}
            <div className="glass-card-dashboard group p-3.5 sm:p-5 rounded-2xl sm:rounded-[22px] relative overflow-hidden flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-[0_16px_36px_-6px_rgba(168,85,247,0.22)] min-w-0">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 shadow-sm group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                  <Award className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <span className="text-[8.5px] sm:text-[10px] font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider flex-shrink-0">
                  Score
                </span>
              </div>
              <div className="mt-3 sm:mt-5 space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">Efficiency Rate</p>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.productivityScore}%</h3>
                <p className="text-[10px] sm:text-[11px] font-bold text-purple-400 flex items-center gap-1 sm:gap-1.5 pt-0.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></span>
                  <span className="truncate">Performance Score</span>
                </p>
              </div>
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
