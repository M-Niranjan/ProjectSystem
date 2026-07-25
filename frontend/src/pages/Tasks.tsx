import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, Plus, Search, Calendar, Users, Clock, Info, ArrowUpRight, Check, Eye, Pencil, LayoutGrid, List } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedTime: number;
  actualTime: number;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  commentsCount?: number;
  dependenciesCount?: number;
  assignee?: { id: number; name: string; profilePhoto?: string };
  project?: { id: number; name: string; title?: string };
}

export default function Tasks() {
  const { selectedProjectId, setTaskModalOpen } = useUIStore();
  const { user } = useAuthStore();
  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProjectFocused, setIsProjectFocused] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
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
      setProjectsList([
        { id: 1, name: 'Prologue SaaS Dashboard' },
        { id: 2, name: 'Workflow Suite Integration' }
      ]);
      if (!activeProjectId) setActiveProjectId(1);
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

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic UI update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/api/tasks/${taskId}`, {
        ...task,
        status: newStatus
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handlePriorityChange = async (taskId: number, newPriority: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic UI update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, priority: newPriority } : t));

    try {
      await api.put(`/api/tasks/${taskId}`, {
        ...task,
        priority: newPriority
      });
    } catch (err) {
      console.error('Failed to update priority', err);
    }
  };

  const showToastMsg = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, 4500);
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
      // Add decline system log comment
      const commentPayload = {
        content: `🚨 [System Log] Task Declined. Reason: ${reason}`
      };
      await api.post(`/api/tasks/${task.id}/comments`, commentPayload);

      // Decline task on API
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

  // Filter tasks based on Search Query, My Tasks checkbox, and Status Tabs
  const filteredTasks = tasks.filter(t => {
    const titleVal = t.title || '';
    const matchesSearch = titleVal.toLowerCase().includes(searchQuery.toLowerCase());
    
    // ACCEPTED tasks appear under the TO_DO tab since they are queued for work
    const matchesStatus = statusFilter === 'ALL'
      || t.status === statusFilter
      || (statusFilter === 'TO_DO' && t.status === 'ACCEPTED');
    
    // If the logged-in user is an employee, show ONLY their assigned tasks.
    // Otherwise (manager/admin), respect the showMyTasksOnly filter.
    const matchesAssignee = user?.role === 'ROLE_EMPLOYEE'
      ? (t.assignee && t.assignee.id === user?.id)
      : (!showMyTasksOnly || (t.assignee && t.assignee.id === user?.id));

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title Header */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 w-full min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white truncate">
            Workspace Tasks
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Review, filter, and modify project tasks in list table views.
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

          <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl flex-shrink-0">
            <button
              onClick={() => setIsGridView(true)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                isGridView ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsGridView(false)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                !isGridView ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-xs space-y-1.5 flex-shrink-0">
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

              {projectsList.filter(p => (p.name || '').toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 ? (
                <div className="px-4 py-2.5 text-xs text-slate-400">No projects found</div>
              ) : (
                projectsList.filter(p => (p.name || '').toLowerCase().includes(projectSearchQuery.toLowerCase())).map(p => {
                  const isActive = p.id === activeProjectId;
                  return (
                    <button
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
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
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200/30 dark:border-white/5 pb-2.5 overflow-x-auto w-full max-w-full">
        {['ALL', 'BACKLOG', 'TO_DO', 'ACCEPTED', 'IN_PROGRESS', 'TESTING', 'REVIEW', 'COMPLETED'].map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === tab
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                : 'text-slate-500 hover:bg-white/10 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tab === 'ACCEPTED' ? '✓ Accepted' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isGridView ? (
        filteredTasks.length === 0 ? (
          <div className="glass-panel p-16 text-center text-slate-450 text-xs font-bold flex flex-col items-center justify-center gap-3">
            <CheckSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
            No tasks found matching current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => {
              const isAssignee = task.assignee && task.assignee.id === user?.id;
              const canEdit = isTeamLeader || isAssignee;
              return (
                <div
                  key={task.id}
                  onClick={() => openTaskDetail(task)}
                  className="glass-panel glass-panel-hover p-5 flex flex-col justify-between min-h-[220px] cursor-pointer relative"
                >
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-start gap-2">
                      {task.status === 'PENDING_ACCEPTANCE' ? (
                        isAssignee ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionModal({ isOpen: true, task, type: 'accept' });
                            }}
                            className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 animate-pulse cursor-pointer border border-amber-500/20 flex items-center gap-1"
                            title="Click to Accept / Decline task assignment"
                          >
                            ⏳ Pending Acceptance
                          </button>
                        ) : (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-slate-500/10 text-slate-400 border border-slate-500/10 flex items-center gap-1">
                            ⏳ Pending Acceptance
                          </span>
                        )
                      ) : task.status === 'ACCEPTED' ? (
                        <span className="text-[8px] font-black px-2 py-0.5 rounded uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                          ✓ Accepted
                        </span>
                      ) : (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                          task.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                          task.status === 'TESTING' ? 'bg-purple-500/10 text-purple-500' :
                          task.status === 'REVIEW' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-slate-500/10 text-slate-400'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      )}

                      <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                        task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                        task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                        task.priority === 'MEDIUM' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-slate-500/10 text-slate-400'
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
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={task.assignee.profilePhoto || getAvatarByName(task.assignee.name)}
                            alt="avatar"
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/10"
                          />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-350">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                          ⏱️ {task.actualTime}h / {task.estimatedTime}h
                        </span>
                        
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openTaskDetail(task)}
                            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isTeamLeader ? (
                            <button
                              onClick={() => setTaskModalOpen(true, null, true, task)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-blue-500"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="p-1 text-[10px] cursor-not-allowed">🔒</span>
                          )}
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
        <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
          <div className="overflow-x-auto w-full min-w-0">
            <table className="w-full text-left text-xs border-collapse min-w-[800px] table-fixed">
              <thead>
                <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="p-4 w-[80px] text-center">Inspect</th>
                  <th className="p-4 w-[260px]">Task Name</th>
                  <th className="p-4 w-[180px]">Project</th>
                  <th className="p-4 w-[180px]">Status</th>
                  <th className="p-4 w-[100px]">Priority</th>
                  <th className="p-4 w-[110px]">Due Date</th>
                  <th className="p-4 w-[120px]">Completion Time</th>
                  <th className="p-4 w-[150px]">Assignee</th>
                  <th className="p-4 w-[100px]">Budget Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/20 dark:divide-white/5">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                      No tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const isAssignee = task.assignee && task.assignee.id === user?.id;
                    const canEdit = isTeamLeader || isAssignee;
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
                            
                            {isTeamLeader ? (
                              <button
                                onClick={() => setTaskModalOpen(true, null, true, task)}
                                className="p-1.5 rounded-lg border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                title="Edit Task Details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="p-1.5 text-slate-400 cursor-not-allowed" title="Only Team Leaders can edit this task.">
                                🔒
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 w-[260px] truncate">
                          <div className="truncate">
                            <p className="font-black text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.description}</p>
                          </div>
                        </td>
                        <td className="p-4 w-[180px] truncate">
                          <span className="font-black text-[10px] uppercase text-blue-500 truncate block">
                            {task.project ? (task.project.name || task.project.title || 'General') : 'General'}
                          </span>
                        </td>
                        <td className="p-4 w-[180px] whitespace-nowrap">
                          {task.status === 'PENDING_ACCEPTANCE' ? (
                            isAssignee ? (
                              <button
                                onClick={() => setActionModal({ isOpen: true, task, type: 'accept' })}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[10px] font-black uppercase rounded animate-pulse cursor-pointer border border-amber-500/20 flex items-center gap-1.5 whitespace-nowrap"
                                title="Click to Accept / Decline task assignment"
                              >
                                ⏳ Pending Acceptance
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-500/10 text-slate-400 text-[10px] font-black uppercase rounded border border-slate-500/10 flex items-center gap-1.5 whitespace-nowrap">
                                ⏳ Pending Acceptance
                              </span>
                            )
                          ) : (
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
                          )}
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
                        <td className="p-4 w-[120px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            ⏱️ {task.estimatedTime || 0} hrs
                          </span>
                        </td>
                        <td className="p-4 w-[150px] whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5 truncate whitespace-nowrap">
                              <img
                                src={task.assignee.profilePhoto || getAvatarByName(task.assignee.name)}
                                alt="avatar"
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/10 flex-shrink-0"
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate whitespace-nowrap">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic whitespace-nowrap">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 w-[100px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {task.actualTime}h/{task.estimatedTime}h
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

      {/* Accept / Decline Action Confirmation Modal */}
      {actionModal.isOpen && actionModal.task && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 space-y-6 border rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
            <div className="space-y-2">
              <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                {actionModal.type === 'accept' ? '📥 Accept Task Assignment' : '🚨 Decline Task Assignment'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Task: <strong className="text-slate-800 dark:text-slate-200">"{actionModal.task.title}"</strong>
              </p>
            </div>

            {actionModal.type === 'accept' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-semibold">
                  Are you sure you want to accept this task? This will assign it to you and update the status to <strong>To Do</strong>.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setActionModal({ isOpen: false, task: null, type: null })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, task: actionModal.task, type: 'decline' })}
                    className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Decline Instead
                  </button>
                  <button
                    onClick={confirmAccept}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-550 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/10 transition-colors cursor-pointer"
                  >
                    Accept Task
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Please provide your decline reason:
                  </label>
                  <textarea
                    rows={4}
                    value={declineReason}
                    onChange={(e) => setDeclineReasonText(e.target.value)}
                    placeholder="Provide details of why you cannot accept this task assignment (scheduling, active tasks, conflicts)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs resize-none"
                  />
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setActionModal({ isOpen: false, task: null, type: null })}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActionModal({ isOpen: true, task: actionModal.task, type: 'accept' })}
                      className="px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Accept Instead
                    </button>
                    <button
                      disabled={!declineReason.trim()}
                      onClick={confirmDecline}
                      className={`px-4 py-2 text-white rounded-xl font-bold text-xs transition-all ${
                        declineReason.trim()
                          ? 'bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-md shadow-rose-500/10'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Decline Task
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
