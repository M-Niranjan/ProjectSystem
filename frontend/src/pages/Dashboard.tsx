import { getAvatarByName, resolveAvatar } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckSquare,
  Users,
  ArrowRight,
  Plus,
  Shield,
  Briefcase,
  Award,
  AlertCircle,
  CheckCircle2,
  FolderGit2,
  Timer,
  ShieldCheck,
  KeyRound,
  Building2,
  ScrollText,
  Network,
  UserPlus,
  Info,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { normalizeRole, formatRoleName } from '../services/authRoles';
import InviteTeammateModal from '../components/InviteTeammateModal';
import LuxurySelect from '../components/common/LuxurySelect';

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
    productivityScore: 98,
  });

  // Employee specific state
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  // Manager & Admin specific state
  const [employeeDirectory, setEmployeeDirectory] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Assign task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskPriority] = useState('HIGH');
  const [newTaskDueDate] = useState('');
  const [newTaskHours] = useState('8');
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
        const assigned = allTasksList.filter(
          (t: any) => t.assignee && (t.assignee.id === user?.id || t.assignee.name === user?.name)
        );
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
          productivityScore: total > 0 ? Math.round((completed / total) * 100) : 98
        });

      } else {
        const reportsRes = await api.get('/api/reports/analytics');
        if (reportsRes.data) {
          setStats(prev => ({ ...prev, ...reportsRes.data, productivityScore: prev.productivityScore || 98 }));
        }

        const teamsRes = await api.get('/api/teams');
        const assignableStaff = (teamsRes.data || []).filter(
          (e: any) => e.role !== 'ROLE_ADMIN' && !e.role?.includes('ADMIN') && e.name !== 'Niranjan'
        );
        setEmployeeDirectory(assignableStaff);
        if (assignableStaff.length > 0 && !newTaskAssigneeId) {
          setNewTaskAssigneeId((assignableStaff[0].id || assignableStaff[0].uid).toString());
        }

        const projectsRes = await api.get('/api/projects');
        setProjectsList(projectsRes.data || []);
        if (projectsRes.data.length > 0 && !newTaskProjectId) {
          setNewTaskProjectId(projectsRes.data[0].id.toString());
        }

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
      window.dispatchEvent(new Event('task-status-updated'));
    } catch (err) {
      setFormError('Failed to save and assign task.');
    }
  };

  const getRoleBadge = (emp: any) => {
    const normRole = normalizeRole(emp.role);
    if (normRole === 'ROLE_MANAGER') return 'Lead';
    const des = (emp.designation || '').toLowerCase();
    if (des.includes('frontend')) return 'Frontend';
    if (des.includes('backend')) return 'Backend';
    if (des.includes('qa') || des.includes('test')) return 'QA';
    return 'Developer';
  };

  // Teammates to display (guaranteeing Vinay, Ram, Mallu as in Option 2)
  const displayTeammates = employeeDirectory.length > 0
    ? employeeDirectory.filter(e => e.role !== 'ROLE_ADMIN' && !e.role?.includes('ADMIN') && e.name !== 'Niranjan')
    : [
        { id: 1007, name: 'Vinay', role: 'ROLE_MANAGER', designation: 'Lead' },
        { id: 1006, name: 'Ram', role: 'ROLE_EMPLOYEE', designation: 'Frontend' },
        { id: 1008, name: 'Mallu', role: 'ROLE_EMPLOYEE', designation: 'Developer' }
      ];

  const activeCount = myTasks.filter(t => t.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6 select-none pt-1 sm:pt-2 pb-12 w-full min-w-0">
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* OPTION 2 UNIFIED HEADER ACROSS ALL DASHBOARDS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 font-heading">
            {isAdmin ? 'Admin Dashboard' : isTeamLead ? 'Team Lead Dashboard' : 'Employee Workspace'}
          </h1>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="text-slate-800 dark:text-slate-200 font-semibold">{user?.name}</span> •{' '}
            {isAdmin ? 'System Administrator & Executive Portal' : isTeamLead ? 'Team Lead & Engineering Manager' : 'Team Member & Engineer'}
          </p>
        </div>

        {/* Option 2 Telemetry Capsule (Digital Clock & Active Workspace) */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0e131f] border border-slate-200/90 dark:border-slate-800/80 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0e131f] border border-slate-200/90 dark:border-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Active workspace</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADMIN DASHBOARD VIEW (OPTION 2 TITANIUM MINIMALIST STUDIO AESTHETIC) */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6 w-full min-w-0">
          {/* Row 1: 4 Symmetrical KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
            {/* Card 1: Active Projects */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:shadow-md dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Projects</span>
                <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  i
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.activeProjects || 2}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">Hospital, SaaS Workspace</p>
              </div>
            </div>

            {/* Card 2: Completed Deliverables */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:shadow-md dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed Projects</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.completedProjects || 1}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    On Track
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">100% On-Time Delivery</p>
              </div>
            </div>

            {/* Card 3: Total Teams */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:shadow-md dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Teams</span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">3</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Engineering, QA</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full w-2/3"></div>
                </div>
              </div>
            </div>

            {/* Card 4: Governance & Security Health */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:shadow-md dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Governance & Security</span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">98%</div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    Optimal Security
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Action Alert Banner */}
          <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600"></div>
            <div className="pl-3 sm:pl-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                System Security & RBAC Configuration Active
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                All role permissions, user access policies, and audit trails are operating under enterprise governance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView('audit-logs')}
              style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)' }}
              className="w-full sm:w-auto px-5 py-2.5 hover:brightness-110 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              View Audit Logs <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Row 3: Admin System Modules & Audit Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* System Modules Panel (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Modules & Governance</h3>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Access</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { title: 'User Directory', desc: 'Create & assign roles', icon: Users, view: 'users' },
                  { title: 'Roles & Perms', desc: 'RBAC permissions matrix', icon: KeyRound, view: 'roles' },
                  { title: 'Org Settings', desc: 'Working defaults & limits', icon: Building2, view: 'organization' },
                  { title: 'Teams Config', desc: 'Manage Team Leads', icon: Network, view: 'teams' },
                  { title: 'Audit Logs', desc: 'Security event history', icon: ScrollText, view: 'audit-logs' },
                ].map(mod => {
                  const Icon = mod.icon;
                  return (
                    <button
                      key={mod.title}
                      onClick={() => setView(mod.view)}
                      className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 hover:border-blue-400 dark:bg-[#080b13] dark:border-slate-800/90 dark:hover:border-slate-700 dark:hover:bg-[#121827] text-left transition-all cursor-pointer group flex flex-col justify-between min-h-[105px]"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:text-slate-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{mod.title}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{mod.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audit Logs Feed Panel (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Security Logs</h3>
                <button
                  onClick={() => setView('audit-logs')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/50 max-h-[300px] overflow-y-auto pr-1">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{log.user || 'System'}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{log.activity}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        {log.status || 'SUCCESS'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No security logs recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TEAM LEAD DASHBOARD VIEW (OPTION 2 EXACT REPRODUCTION) */}
      {/* ========================================================================= */}
      {isTeamLead && (
        <div className="space-y-6 w-full min-w-0">
          {/* Row 1: 4 Symmetrical KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
            {/* Card 1: Active Projects */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-blue-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Projects</span>
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  i
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.activeProjects || 2}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">Hospital Management System</p>
              </div>
            </div>

            {/* Card 2: Pending Code Reviews */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-amber-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Code Reviews</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">1</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                    Needs Review
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">Patient Dashboard</p>
              </div>
            </div>

            {/* Card 3: Active Tasks */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-blue-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Tasks</span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalTasks || 8}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">2 In Progress</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full w-1/4"></div>
                </div>
              </div>
            </div>

            {/* Card 4: Sprint Velocity & Health */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-emerald-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sprint Velocity & Health</span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">98%</div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                    Optimal Health
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Real World Workflow Highlight & Task Review Queue Banner */}
          <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 dark:bg-blue-500"></div>

            <div className="pl-3 sm:pl-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Hospital Management System — Create Patient Dashboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Submitted by <strong className="text-slate-800 dark:text-slate-200">Rahul</strong> (Employee) for Team Lead approval.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setView('reviews')}
              style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)' }}
              className="w-full sm:w-auto px-5 py-2.5 hover:brightness-110 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              Review & Approve Task <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Row 3: Team Workload & Allocation AND Quick Task Assignment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Panel: Team Workload & Allocation (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200/70 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team Workload & Allocation</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Sprint capacity & member bandwidth</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 dark:bg-[#151c2c] dark:hover:bg-[#1c263c] dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Invite Teammate</span><span className="sm:hidden">Invite</span>
                </button>
              </div>

              <div className="space-y-3">
                {displayTeammates.map((emp, idx) => {
                  const workloadPct = idx === 0 ? 65 : idx === 1 ? 45 : idx === 2 ? 80 : 50;
                  const workloadGradient = workloadPct >= 80 
                    ? 'from-amber-500 to-rose-500' 
                    : workloadPct >= 60 
                    ? 'from-blue-500 to-indigo-500' 
                    : 'from-emerald-500 to-teal-400';
                  const workloadStatus = workloadPct >= 80 ? 'Heavy Load' : workloadPct >= 60 ? 'Optimal' : 'Available';
                  const workloadBadge = workloadPct >= 80 
                    ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30' 
                    : workloadPct >= 60 
                    ? 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30';
                  const isSelectedForAssign = newTaskAssigneeId === (emp.id || emp.uid).toString();

                  return (
                    <div
                      key={emp.id || emp.uid}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-2.5 ${
                        isSelectedForAssign
                          ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-500/50 shadow-xs ring-1 ring-blue-500/20'
                          : 'bg-slate-50/60 hover:bg-slate-100/70 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] border-slate-200/80 dark:border-white/5'
                      }`}
                    >
                      {/* Top Row: Full Name, Role Chip, Designation, and Assign Button */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={resolveAvatar(emp.profilePhoto, emp.name, (emp as any).gender)}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getAvatarByName(emp.name, (emp as any).gender);
                              }}
                              alt={emp.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-500/20 shadow-xs"
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
                                {emp.name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/60 shrink-0">
                                {getRoleBadge(emp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                              {emp.designation || (emp as any).department || 'Engineering Member'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setNewTaskAssigneeId((emp.id || emp.uid).toString());
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                            isSelectedForAssign
                              ? 'bg-blue-600 text-white shadow-blue-500/30'
                              : 'bg-white hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200/90 dark:bg-[#151c2c] dark:hover:bg-blue-600 dark:border-slate-700/80 dark:text-slate-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" /> <span>{isSelectedForAssign ? 'Selected' : 'Assign'}</span>
                        </button>
                      </div>

                      {/* Bottom Row: Capacity allocation progress bar & percentage */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            Capacity:
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${workloadBadge}`}>
                            {workloadStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 flex-1 max-w-[180px] sm:max-w-xs justify-end">
                          <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${workloadGradient} rounded-full transition-all duration-500`}
                              style={{ width: `${workloadPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 w-8 text-right font-mono">
                            {workloadPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Quick Task Assignment (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Task Assignment</h3>

              {formSuccess && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ {formSuccess}</p>}
              {formError && <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">⚠️ {formError}</p>}

              <form onSubmit={handleAssignTaskSubmit} className="space-y-3.5">
                <input
                  type="text"
                  placeholder="Task title (e.g. Patient Dashboard UI)"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 dark:bg-[#080b13] dark:border-slate-800/90 dark:text-slate-200 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all font-medium"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <LuxurySelect
                    value={newTaskProjectId}
                    onChange={(val) => setNewTaskProjectId(val)}
                    placeholder="Project"
                    options={projectsList.map(p => ({
                      value: String(p.id),
                      label: p.name,
                      icon: <FolderGit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    }))}
                  />

                  <LuxurySelect
                    value={newTaskAssigneeId}
                    onChange={(val) => setNewTaskAssigneeId(val)}
                    placeholder="Assignee"
                    options={displayTeammates.map(emp => ({
                      value: String(emp.id || emp.uid),
                      label: emp.name,
                      subLabel: (emp.designation || 'Engineer').replace(/Devoloper/g, 'Developer'),
                      icon: (
                        <img
                          src={resolveAvatar(emp.profilePhoto, emp.name, emp.gender)}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/20"
                        />
                      )
                    }))}
                  />
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)' }}
                  className="w-full py-2.5 hover:brightness-110 text-white rounded-xl text-xs font-semibold shadow cursor-pointer transition-all active:scale-98"
                >
                  Create & Assign Task
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EMPLOYEE DASHBOARD VIEW (OPTION 2 TITANIUM MINIMALIST STUDIO AESTHETIC) */}
      {/* ========================================================================= */}
      {isEmployee && (
        <div className="space-y-6 w-full min-w-0">
          {/* Row 1: 4 Symmetrical KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0">
            {/* Card 1: My Active Tasks */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-blue-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">My Active Tasks</span>
                <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
                  i
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeCount}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">Hospital & SaaS Workspace</p>
              </div>
            </div>

            {/* Card 2: Pending Deliverables */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-amber-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Deliverables</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{pendingTasks.length}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                    Action Required
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 truncate">New Work Assignments</p>
              </div>
            </div>

            {/* Card 3: Completed Tasks */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-emerald-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed Tasks</span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.completedTasks || 0}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full w-full"></div>
                </div>
              </div>
            </div>

            {/* Card 4: Efficiency & Velocity */}
            <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg relative overflow-hidden group hover:border-emerald-400/50 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Velocity & Score</span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.productivityScore || 98}%</div>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                    Optimal Health
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Task Acceptance Alerts Banner (if any) */}
          {pendingTasks.length > 0 && (
            <div className="bg-amber-50/70 dark:bg-[#0e131f]/85 backdrop-blur-xl border border-amber-200 dark:border-amber-500/30 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-3 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
              <div className="pl-3 sm:pl-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" /> New Task Assignment Pending Acceptance
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Review the assignments delegated to you and accept to start tracking time.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-3 sm:pl-2 pt-2">
                {pendingTasks.map(t => (
                  <div key={t.id} className="p-3.5 bg-white border border-amber-200/80 dark:bg-[#080b13] dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.title}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t.description}</p>
                    </div>
                    <button
                      onClick={() => handleAcceptTask(t.id)}
                      style={{ backgroundColor: '#2563eb' }}
                      className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold hover:brightness-110 cursor-pointer shrink-0 transition-all shadow-xs"
                    >
                      Accept Task
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks & Workflow Table */}
          <div className="bg-white dark:bg-[#0e131f]/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs dark:shadow-lg space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> My Assigned Tasks & Deliverables
              </h3>
              <button
                onClick={() => setView('my-tasks')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View All Tasks →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {myTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No tasks assigned currently.</p>
              ) : (
                myTasks.map(t => (
                  <div key={t.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 uppercase">
                          {t.project?.name || 'Project Workspace'}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          t.status === 'CODE_REVIEW'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30'
                            : t.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30'
                        }`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{t.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {t.status === 'IN_PROGRESS' || t.status === 'ACCEPTED' || t.status === 'TODO' || t.status === 'TO_DO' ? (
                        <button
                          onClick={() => handleSubmitForReview(t.id)}
                          style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)' }}
                          className="px-4 py-2 hover:brightness-110 text-white rounded-xl text-xs font-semibold shadow cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          Submit for Review <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : t.status === 'CODE_REVIEW' ? (
                        <span className="text-[10px] font-bold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 rounded-xl dark:border-amber-500/30">
                          ⏳ Pending Team Lead Review
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full">
                          ✓ Deliverable Passed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Leader Invite Teammate Modal */}
      <InviteTeammateModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSuccess={async () => {
          await loadDashboardData();
        }}
      />
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
