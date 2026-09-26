import { getAvatarByName, resolveAvatar } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Calendar,
  Users,
  Clock,
  Info,
  ArrowUpRight,
  Check,
  Eye,
  Pencil,
  LayoutGrid,
  List,
  UserCheck,
  UserPlus,
  ChevronDown,
  AlertCircle,
  Filter,
  Layers
} from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatRoleName } from '../services/authRoles';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedTime: number;
  actualTime: number;
  dependencyId?: number;
  allocationPercent?: number;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  commentsCount?: number;
  dependenciesCount?: number;
  assignee?: { id: number; name: string; profilePhoto?: string };
  project?: { id: number; name: string; title?: string };
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  designation?: string;
  profilePhoto?: string;
}

export default function Tasks() {
  const { selectedProjectId, setTaskModalOpen } = useUIStore();
  const { user } = useAuthStore();
  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL'); // 'ALL' | 'UNASSIGNED' | 'userId'
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [groupByAssignee, setGroupByAssignee] = useState(false);

  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProjectFocused, setIsProjectFocused] = useState(false);
  const [isGridView, setIsGridView] = useState(false);

  // Assignee Reassignment Popover state
  const [assigningTaskId, setAssigningTaskId] = useState<number | null>(null);

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    task: Task | null;
    type: 'accept' | 'decline' | null;
  }>({ isOpen: false, task: null, type: null });
  const [declineReason, setDeclineReasonText] = useState('');
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'success' });

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      setProjectsList(res.data);
      if (!activeProjectId && res.data.length > 0) {
        setActiveProjectId(res.data[0].id);
      }
    } catch (err) {
      setProjectsList([]);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const res = await api.get('/api/teams');
      // System Administrator manages the portal only - filter out ROLE_ADMIN from assignment section
      const assignableMembers = (res.data || []).filter((m: any) => m.role !== 'ROLE_ADMIN' && !m.role?.includes('ADMIN'));
      setTeamMembers(assignableMembers);
    } catch (err) {
      setTeamMembers([]);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = activeProjectId 
        ? await api.get(`/api/tasks/project/${activeProjectId}`)
        : await api.get('/api/tasks');
      setTasks(res.data || []);
    } catch (err) {
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [activeProjectId]);

  useEffect(() => {
    window.addEventListener('task-created', fetchTasks);
    window.addEventListener('task-status-updated', fetchTasks);
    return () => {
      window.removeEventListener('task-created', fetchTasks);
      window.removeEventListener('task-status-updated', fetchTasks);
    };
  }, [activeProjectId]);

  const showToastMsg = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, 4500);
  };

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    if (newStatus === 'COMPLETED' && user?.role === 'ROLE_EMPLOYEE') {
      showToastMsg('🔒 Access Denied: Employees cannot mark tasks as COMPLETED. Please submit your task for REVIEW for Team Leader approval.', 'error');
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/api/tasks/${taskId}`, {
        ...task,
        status: newStatus
      });
      showToastMsg(`Task "${task.title}" status set to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handlePriorityChange = async (taskId: number, newPriority: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(tasks.map(t => t.id === taskId ? { ...t, priority: newPriority } : t));

    try {
      await api.put(`/api/tasks/${taskId}`, {
        ...task,
        priority: newPriority
      });
      showToastMsg(`Priority for "${task.title}" updated to ${newPriority}`);
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  };

  const handleReassignTask = async (taskId: number, newAssigneeId: number | null) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const selectedMember = teamMembers.find(m => m.id === newAssigneeId);
    const updatedAssignee = newAssigneeId && selectedMember ? {
      id: selectedMember.id,
      name: selectedMember.name,
      profilePhoto: selectedMember.profilePhoto
    } : undefined;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignee: updatedAssignee } : t));
    setAssigningTaskId(null);

    try {
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.assignee = updatedAssignee ? { id: updatedAssignee.id } : null;
      await api.put(`/api/tasks/${taskId}`, taskData);
      showToastMsg(
        updatedAssignee
          ? `Task "${task.title}" assigned to ${updatedAssignee.name}!`
          : `Task "${task.title}" marked as unassigned.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to reassign task', err);
      showToastMsg('Failed to reassign task.', 'error');
    }
  };

  const confirmAccept = async () => {
    if (!actionModal.task) return;
    const task = actionModal.task;
    try {
      const taskRes = await api.get(`/api/tasks/${task.id}`);
      const taskData = taskRes.data;
      taskData.status = 'TO_DO';
      await api.put(`/api/tasks/${task.id}`, taskData);
      showToastMsg(`Task "${task.title}" accepted successfully!`, 'success');
      setActionModal({ isOpen: false, task: null, type: null });
      fetchTasks();
    } catch (err) {
      showToastMsg('Failed to accept task assignment.', 'error');
    }
  };

  const confirmDecline = async () => {
    if (!actionModal.task || !declineReason.trim()) return;
    const task = actionModal.task;
    const reason = declineReason.trim();
    try {
      const commentPayload = {
        content: `🚨 [System Log] Task Declined. Reason: ${reason}`
      };
      await api.post(`/api/tasks/${task.id}/comments`, commentPayload);

      const taskRes = await api.get(`/api/tasks/${task.id}`);
      const taskData = taskRes.data;
      taskData.status = 'BACKLOG';
      taskData.assignee = null;
      taskData.declineReason = reason;
      await api.put(`/api/tasks/${task.id}`, taskData);
      
      showToastMsg(`Declined assignment for "${task.title}". Reason logged.`, 'info');
      setActionModal({ isOpen: false, task: null, type: null });
      setDeclineReasonText('');
      fetchTasks();
    } catch (err) {
      showToastMsg('Failed to submit decline response.', 'error');
    }
  };

  const openTaskDetail = (task: Task) => {
    window.dispatchEvent(new CustomEvent('open-task-detail', { detail: task }));
  };

  // Filter tasks based on Search Query, Status, Assignee, and Role permissions
  const filteredTasks = tasks.filter(t => {
    const titleVal = t.title || '';
    const matchesSearch = titleVal.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL'
      || t.status === statusFilter
      || (statusFilter === 'TO_DO' && t.status === 'ACCEPTED');
    
    // Assignee filter logic
    let matchesAssigneeFilter = true;
    if (assigneeFilter === 'UNASSIGNED') {
      matchesAssigneeFilter = !t.assignee;
    } else if (assigneeFilter !== 'ALL') {
      matchesAssigneeFilter = t.assignee?.id === parseInt(assigneeFilter);
    }

    const matchesRoleAssignee = user?.role === 'ROLE_EMPLOYEE'
      ? (t.assignee && t.assignee.id === user?.id)
      : (!showMyTasksOnly || (t.assignee && t.assignee.id === user?.id));

    return matchesSearch && matchesStatus && matchesAssigneeFilter && matchesRoleAssignee;
  });

  // Calculate team workload counts
  const unassignedCount = tasks.filter(t => !t.assignee).length;

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title & Actions Header */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white truncate">
            Workspace Tasks
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Team Leaders task assignment tracker, workload distribution, and status board.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 max-w-full">
          {user?.role !== 'ROLE_EMPLOYEE' && (
            <label className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl px-3 py-2 flex-shrink-0">
              <input
                type="checkbox"
                checked={showMyTasksOnly}
                onChange={(e) => setShowMyTasksOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              🧑 My Tasks Only
            </label>
          )}

          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs w-32 sm:w-44"
            />
          </div>

          {isTeamLeader && (
            <button
              onClick={() => setTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}

          {/* View Toggles (Grid / List / Group by Assignee) */}
          <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl flex-shrink-0">
            <button
              onClick={() => { setIsGridView(true); setGroupByAssignee(false); }}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                isGridView && !groupByAssignee ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid
            </button>
            <button
              onClick={() => { setIsGridView(false); setGroupByAssignee(false); }}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                !isGridView && !groupByAssignee ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            {isTeamLeader && (
              <button
                onClick={() => setGroupByAssignee(!groupByAssignee)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                  groupByAssignee ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Group Tasks by Assignee"
              >
                <Users className="w-3.5 h-3.5" /> Group Assignee
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TEAM LEADER ASSIGNEE TRACKING BAR (Visible ONLY to Team Leaders) */}
      {isTeamLeader && (
        <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-white tracking-tight uppercase">
                  TEAM LEAD ASSIGNEE TRACKER
                </h3>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Filter and track tasks by assigned team member workload.
                </p>
              </div>
            </div>

            {unassignedCount > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {unassignedCount} Unassigned Task{unassignedCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Team Member Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setAssigneeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                assigneeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>All Members ({tasks.length})</span>
            </button>

            <button
              onClick={() => setAssigneeFilter('UNASSIGNED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                assigneeFilter === 'UNASSIGNED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <span>⚠️ Unassigned ({unassignedCount})</span>
            </button>

            {teamMembers.map((member) => {
              const memberTaskCount = tasks.filter(t => t.assignee?.id === member.id).length;
              const isSelected = assigneeFilter === String(member.id);
              return (
                <button
                  key={member.id}
                  onClick={() => setAssigneeFilter(String(member.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs scale-[1.02]'
                      : 'bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <img
                    src={resolveAvatar(member.profilePhoto, member.name, (member as any).gender)}
                    alt="avatar"
                    className="w-4 h-4 rounded-full object-cover ring-1 ring-blue-500/30"
                  />
                  <span>{member.name}</span>
                  <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {memberTaskCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Selector & Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-xs space-y-1 flex-shrink-0">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Select Project Workspace:</label>
          <div className="relative">
            <input
              type="text"
              className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-bold text-xs cursor-pointer"
              placeholder="Select Project"
              value={
                isProjectFocused
                  ? projectSearchQuery
                  : (projectsList.find(p => p.id === activeProjectId)
                      ? `📁 ${projectsList.find(p => p.id === activeProjectId).name}`
                      : '')
              }
              onFocus={() => {
                setIsProjectDropdownOpen(true);
                setIsProjectFocused(true);
                setProjectSearchQuery('');
              }}
              onBlur={() => {
                setTimeout(() => {
                  setIsProjectDropdownOpen(false);
                  setIsProjectFocused(false);
                  setProjectSearchQuery('');
                }, 200);
              }}
              onChange={(e) => {
                setProjectSearchQuery(e.target.value);
                setIsProjectDropdownOpen(true);
              }}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <span className="text-slate-400 text-[9px]">▼</span>
            </div>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto glass-panel border border-slate-200/50 dark:border-white/5 shadow-2xl z-40 rounded-xl py-1">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setActiveProjectId(null);
                    setIsProjectDropdownOpen(false);
                    setIsProjectFocused(false);
                    setProjectSearchQuery('');
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase transition-colors flex items-center gap-2 cursor-pointer ${
                    activeProjectId === null
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>📁</span>
                  <span className="truncate">All Projects</span>
                  {activeProjectId === null && <span className="ml-auto">✓</span>}
                </button>

                {projectsList.filter(p => (p.name || '').toLowerCase().includes(projectSearchQuery.toLowerCase())).map(p => {
                  const isActive = p.id === activeProjectId;
                  return (
                    <button
                      key={p.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setActiveProjectId(p.id);
                        setIsProjectDropdownOpen(false);
                        setIsProjectFocused(false);
                        setProjectSearchQuery('');
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-black uppercase transition-colors flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>📁</span>
                      <span className="truncate">{p.name}</span>
                      {isActive && <span className="ml-auto">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 border-b border-slate-200/30 dark:border-white/5 pb-2.5 overflow-x-auto w-full max-w-full">
          {['ALL', 'BACKLOG', 'TO_DO', 'IN_PROGRESS', 'TESTING', 'REVIEW', 'COMPLETED'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                  : 'text-slate-500 hover:bg-white/10 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Task Listing (Grouped by Assignee OR Grid OR List Table) */}
      {groupByAssignee ? (
        /* ================= GROUP BY ASSIGNEE WORKLOAD VIEW ================= */
        <div className="space-y-6">
          {/* Unassigned Workload Group */}
          <div className="glass-panel p-5 border border-amber-500/30 rounded-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-600 dark:text-amber-400">
                    Unassigned Tasks ({unassignedCount})
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tasks pending Team Leader assignment to a specific team member.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.filter(t => !t.assignee).map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 rounded-2xl space-y-3 shadow-xs hover:border-amber-500/40 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {task.priority} Priority
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">Due: {task.dueDate}</span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{task.title}</h4>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{task.description}</p>
                  </div>

                  {/* Reassign Button */}
                  <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-500 truncate max-w-[120px]">
                      📁 {task.project?.name || 'General'}
                    </span>
                    <button
                      onClick={() => setAssigningTaskId(task.id)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" /> Assign Teammate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grouped by Team Member */}
          {teamMembers.map(member => {
            const memberTasks = filteredTasks.filter(t => t.assignee?.id === member.id);
            if (memberTasks.length === 0 && assigneeFilter !== 'ALL') return null;

            return (
              <div key={member.id} className="glass-panel p-5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatar(member.profilePhoto, member.name, (member as any).gender)}
                      alt="avatar"
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-blue-500/30"
                    />
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {member.name}
                        <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md uppercase">
                          {member.designation || formatRoleName(member.role, 'title')}
                        </span>
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {memberTasks.length} Active Task{memberTasks.length !== 1 ? 's' : ''} Assigned
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memberTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => openTaskDetail(task)}
                      className="p-4 bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl space-y-3 shadow-xs hover:border-blue-500/30 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                          task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">Due: {task.dueDate}</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">{task.title}</h4>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{task.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-blue-500 truncate max-w-[120px]">
                          📁 {task.project?.name || 'General'}
                        </span>
                        {isTeamLeader && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssigningTaskId(task.id);
                            }}
                            className="px-2 py-1 bg-slate-200/60 dark:bg-white/10 hover:bg-blue-500/20 text-slate-700 dark:text-slate-300 hover:text-blue-500 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Re-assign
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : isGridView ? (
        /* ================= GRID VIEW ================= */
        filteredTasks.length === 0 ? (
          <div className="glass-panel p-16 text-center text-slate-450 text-xs font-bold flex flex-col items-center justify-center gap-3">
            <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
            No tasks found matching current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => {
              const isAssignee = task.assignee && task.assignee.id === user?.id;
              return (
                <div
                  key={task.id}
                  onClick={() => openTaskDetail(task)}
                  className="glass-panel glass-panel-hover p-5 flex flex-col justify-between min-h-[220px] cursor-pointer relative"
                >
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-500/10 text-slate-400'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>

                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {task.priority} Priority
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white line-clamp-1">{task.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{task.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-200/10 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span className="text-blue-500 flex items-center gap-1 font-black truncate max-w-[150px]">
                        📁 {task.project ? (task.project.name || task.project.title || 'General') : 'General'}
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3 h-3" /> {task.dueDate}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      {/* Interactive Assignee Badge for Team Leaders */}
                      {isTeamLeader ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningTaskId(task.id);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 font-extrabold text-[10px] cursor-pointer transition-all"
                        >
                          {task.assignee ? (
                            <>
                              <img
                                src={resolveAvatar(task.assignee.profilePhoto, task.assignee.name, (task.assignee as any).gender)}
                                alt="avatar"
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span>{task.assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-amber-500">⚠️ Assign Teammate</span>
                          )}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      ) : (
                        task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={resolveAvatar(task.assignee.profilePhoto, task.assignee.name, (task.assignee as any).gender)}
                              alt="avatar"
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/10"
                            />
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                        )
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 border border-slate-500/10">
                          ⏱️ {task.actualTime || 0}h/{task.estimatedTime || 0}h
                        </span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openTaskDetail(task)}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ================= TABLE LIST VIEW ================= */
        <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left text-xs border-collapse min-w-[850px] table-fixed">
              <thead>
                <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 w-[80px] text-center">Inspect</th>
                  <th className="p-4 w-[260px]">Task Name</th>
                  <th className="p-4 w-[170px]">Project</th>
                  <th className="p-4 w-[160px]">Status</th>
                  <th className="p-4 w-[100px]">Priority</th>
                  <th className="p-4 w-[110px]">Due Date</th>
                  <th className="p-4 w-[170px]">Assigned Team Member</th>
                  <th className="p-4 w-[100px]">Time Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/20 dark:divide-white/5">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const isAssignee = task.assignee && task.assignee.id === user?.id;
                    return (
                      <tr key={task.id} className="hover:bg-slate-500/5 transition-colors font-bold text-slate-700 dark:text-slate-300">
                        <td className="p-4 w-[80px] text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => openTaskDetail(task)}
                              className="p-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="Open Details Inspector"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 w-[260px] truncate">
                          <div className="truncate">
                            <p className="font-black text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.description}</p>
                          </div>
                        </td>
                        <td className="p-4 w-[170px] truncate">
                          <span className="font-black text-[10px] uppercase text-blue-500 truncate block">
                            {task.project ? (task.project.name || task.project.title || 'General') : 'General'}
                          </span>
                        </td>
                        <td className="p-4 w-[160px] whitespace-nowrap">
                          <select
                            disabled={!isTeamLeader && !isAssignee}
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`bg-transparent border-none font-bold text-xs text-blue-500 outline-none whitespace-nowrap ${(!isTeamLeader && !isAssignee) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          >
                            <option className="dark:bg-slate-800" value="BACKLOG">Backlog</option>
                            <option className="dark:bg-slate-800" value="TO_DO">To Do</option>
                            <option className="dark:bg-slate-800" value="IN_PROGRESS">In Progress</option>
                            <option className="dark:bg-slate-800" value="TESTING">Testing</option>
                            <option className="dark:bg-slate-800" value="REVIEW">Review</option>
                            <option className="dark:bg-slate-800" value="COMPLETED">Completed</option>
                          </select>
                        </td>
                        <td className="p-4 w-[100px] whitespace-nowrap">
                          <select
                            disabled={!isTeamLeader}
                            value={task.priority}
                            onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                            className={`bg-transparent border-none font-black text-[10px] uppercase outline-none whitespace-nowrap ${!isTeamLeader ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
                              task.priority === 'CRITICAL' ? 'text-red-500' :
                              task.priority === 'HIGH' ? 'text-amber-500' :
                              'text-slate-400'
                            }`}
                          >
                            <option className="dark:bg-slate-800 text-slate-700" value="LOW">Low</option>
                            <option className="dark:bg-slate-800 text-slate-700" value="MEDIUM">Medium</option>
                            <option className="dark:bg-slate-800 text-slate-700" value="HIGH">High</option>
                            <option className="dark:bg-slate-800 text-slate-700" value="CRITICAL">Critical</option>
                          </select>
                        </td>
                        <td className="p-4 w-[110px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {task.dueDate}
                          </span>
                        </td>
                        
                        {/* Interactive Assignee Dropdown for Team Leaders */}
                        <td className="p-4 w-[170px] whitespace-nowrap">
                          {isTeamLeader ? (
                            <button
                              onClick={() => setAssigningTaskId(task.id)}
                              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20 font-extrabold text-xs cursor-pointer transition-all"
                            >
                              {task.assignee ? (
                                <>
                                  <img
                                    src={resolveAvatar(task.assignee.profilePhoto, task.assignee.name, (task.assignee as any).gender)}
                                    alt="avatar"
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                  <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                                </>
                              ) : (
                                <span className="text-amber-500">⚠️ Assign</span>
                              )}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          ) : (
                            task.assignee ? (
                              <div className="flex items-center gap-1.5 truncate">
                                <img
                                  src={resolveAvatar(task.assignee.profilePhoto, task.assignee.name, (task.assignee as any).gender)}
                                  alt="avatar"
                                  className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/10 flex-shrink-0"
                                />
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{task.assignee.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )
                          )}
                        </td>

                        <td className="p-4 w-[100px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            ⏱️ {task.actualTime || 0}h/{task.estimatedTime || 0}h
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Team Member Re-assignment Modal Popover */}
      {assigningTaskId !== null && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-5 border rounded-3xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black tracking-tight">Assign Task to Teammate</h3>
              </div>
              <button
                onClick={() => setAssigningTaskId(null)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Select a team member to assign responsibility for this task.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              <button
                onClick={() => handleReassignTask(assigningTaskId, null)}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-black transition-all cursor-pointer"
              >
                <span>⚠️ Mark as Unassigned</span>
              </button>

              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleReassignTask(assigningTaskId, member.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/60 dark:border-white/10 hover:bg-blue-500/10 text-xs font-bold transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={resolveAvatar(member.profilePhoto, member.name, (member as any).gender)}
                      alt="avatar"
                      className="w-7 h-7 rounded-xl object-cover ring-1 ring-blue-500/20"
                    />
                    <div className="text-left">
                      <p className="font-black group-hover:text-blue-500 transition-colors">{member.name}</p>
                      <p className="text-[9.5px] text-slate-400 font-semibold">{member.designation || formatRoleName(member.role, 'title')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    Assign →
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast Alert Banner */}
      {toast.show && createPortal(
        <div className="fixed top-4 right-4 z-[99999] flex items-center gap-3 px-4.5 py-3 rounded-2xl border backdrop-blur-xl shadow-lg transition-all duration-300 bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white">
          <span className={`text-sm font-black ${
            toast.type === 'success' ? 'text-emerald-500' : toast.type === 'error' ? 'text-rose-500' : 'text-blue-500'
          }`}>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✖' : 'ℹ'}
          </span>
          <span className="text-xs font-black tracking-wide">{toast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
