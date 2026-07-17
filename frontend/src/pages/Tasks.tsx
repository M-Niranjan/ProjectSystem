import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Search, Calendar, Users, Clock, Info, ArrowUpRight, Check, Eye, Pencil } from 'lucide-react';
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
  project?: { id: number; name: string };
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

  const handleAcceptTask = async (taskId: number) => {
    try {
      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.status = 'TO_DO';
      await api.put(`/api/tasks/${taskId}`, taskData);
      fetchTasks();
    } catch (err) {
      console.error('Failed to accept task', err);
    }
  };

  const handleDeclineTask = async (taskId: number) => {
    const reason = prompt("Enter reason for declining the task:") || "Declined via Workspace Tasks";
    try {
      const commentPayload = {
        content: `🚨 [System Log] Task Declined. Reason: ${reason}`
      };
      await api.post(`/api/tasks/${taskId}/comments`, commentPayload);

      const taskRes = await api.get(`/api/tasks/${taskId}`);
      const taskData = taskRes.data;
      taskData.status = 'BACKLOG';
      taskData.assignee = null;
      await api.put(`/api/tasks/${taskId}`, taskData);
      fetchTasks();
    } catch (err) {
      console.error('Failed to decline task', err);
    }
  };

  const openTaskDetail = (task: Task) => {
    window.dispatchEvent(new CustomEvent('open-task-detail', { detail: task }));
  };

  // Filter tasks based on Search Query, My Tasks checkbox, and Status Tabs
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    
    // If the logged-in user is an employee, show ONLY their assigned tasks.
    // Otherwise (manager/admin), respect the showMyTasksOnly filter.
    const matchesAssignee = user?.role === 'ROLE_EMPLOYEE'
      ? (t.assignee && t.assignee.id === user?.id)
      : (!showMyTasksOnly || (t.assignee && t.assignee.id === user?.id));

    return matchesSearch && matchesStatus && matchesAssignee;
  });

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Workspace Tasks
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Review, filter, and modify project tasks in list table views.
          </p>
        </div>

        {/* Search, toggle, and Action Button */}
        <div className="flex items-center gap-3">
          {user?.role !== 'ROLE_EMPLOYEE' && (
            <label className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl px-3.5 py-2">
              <input
                type="checkbox"
                checked={showMyTasksOnly}
                onChange={(e) => setShowMyTasksOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
              />
              🧑 My Tasks Only
            </label>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs w-48"
            />
          </div>

          {isTeamLeader && (
            <button
              onClick={() => setTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Searchable Project Selector */}
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

          {/* Floating Dropdown Suggestion List */}
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

              {projectsList.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())).length === 0 ? (
                <div className="px-4 py-2.5 text-xs text-slate-400">No projects found</div>
              ) : (
                projectsList.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase())).map(p => {
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

      {/* Tabs Filter Bar */}
      <div className="flex gap-2 border-b border-slate-200/30 dark:border-white/5 pb-2.5 overflow-x-auto">
        {['ALL', 'BACKLOG', 'TO_DO', 'IN_PROGRESS', 'TESTING', 'REVIEW', 'COMPLETED'].map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === tab
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                : 'text-slate-500 hover:bg-white/10 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Tasks Table Layout */}
      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4 w-12 text-center">Inspect</th>
                <th className="p-4">Task Name</th>
                <th className="p-4">Project</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Completion Time</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Budget Log</th>
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
                      <td className="p-4 text-center">
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
                      <td className="p-4">
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-100">{task.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 max-w-xs">{task.description}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-[10px] uppercase text-blue-500">
                          {task.project ? task.project.name : 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        {task.status === 'PENDING_ACCEPTANCE' ? (
                          isAssignee ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcceptTask(task.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineTask(task.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                              >
                                Unaccept
                              </button>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded animate-pulse">
                              Pending Acceptance
                            </span>
                          )
                        ) : (
                          <select
                            disabled={!isTeamLeader && !isAssignee}
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className={`bg-transparent border-none font-bold text-xs text-blue-500 outline-none ${(!isTeamLeader && !isAssignee) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                      <td className="p-4">
                        <select
                          disabled={!isTeamLeader}
                          value={task.priority}
                          onChange={(e) => handlePriorityChange(task.id, e.target.value)}
                          className={`bg-transparent border-none font-black text-[10px] uppercase outline-none ${!isTeamLeader ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${
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
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {task.dueDate}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          ⏱️ {task.estimatedTime || 0} hrs
                        </span>
                      </td>
                      <td className="p-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={task.assignee.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${task.assignee.name}`}
                              alt="avatar"
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500/10"
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{task.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {task.actualTime}h / {task.estimatedTime}h
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
    </div>
  );
}
