import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderGit2, Star, Trash2, LayoutGrid, List, Search, Plus, Calendar, DollarSign, Users, X, Info, Check, Pencil } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  priority: string;
  budget: number;
  spent: number;
  deadline: string;
  isFavorite: boolean;
  colorLabel?: string;
  membersCount?: number;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isGridView, setIsGridView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { setView } = useUIStore();

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [priority, setPriority] = useState('MEDIUM');
  const [budget, setBudget] = useState('10000');
  const [deadline, setDeadline] = useState('');
  const [colorLabel, setColorLabel] = useState('#3B82F6');
  const [memberEmail, setMemberEmail] = useState('');
  const [addedEmails, setAddedEmails] = useState<string[]>([]);

  // Default Mock Projects
  const mockProjects: Project[] = [
    { id: 1, name: 'Prologue SaaS Dashboard', description: 'Build a next-generation enterprise project manager with glassmorphism styles.', status: 'ACTIVE', priority: 'HIGH', budget: 25000, spent: 8500, deadline: '2026-09-15', isFavorite: true, colorLabel: '#6366F1', membersCount: 5 },
    { id: 2, name: 'Workflow Suite Integration', description: 'Design real-time WebSockets communication channels and notification triggers.', status: 'PLANNING', priority: 'CRITICAL', budget: 15000, spent: 0, deadline: '2026-08-30', isFavorite: false, colorLabel: '#3B82F6', membersCount: 3 },
    { id: 3, name: 'Notion Sync Engine', description: 'Build background cron schedulers to sync tasks and milestones automatically.', status: 'COMPLETED', priority: 'MEDIUM', budget: 10000, spent: 9800, deadline: '2026-06-30', isFavorite: true, colorLabel: '#22C55E', membersCount: 4 },
    { id: 4, name: 'Customer Success Portal', description: 'Implement interactive charts, PDF exporters, and spreadsheet reports downloads.', status: 'ACTIVE', priority: 'LOW', budget: 8000, spent: 2400, deadline: '2026-10-15', isFavorite: false, colorLabel: '#F59E0B', membersCount: 2 }
  ];

  const fetchProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      if (response.data && response.data.length > 0) {
        setProjects(response.data);
      } else {
        setProjects(mockProjects);
      }
    } catch (err) {
      setProjects(mockProjects);
    }
  };

  useEffect(() => {
    fetchProjects();

    window.addEventListener('project-created', fetchProjects);
    return () => window.removeEventListener('project-created', fetchProjects);
  }, []);

  const toggleFavorite = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.put(`/api/projects/${id}/favorite`);
      setProjects(projects.map(p => p.id === id ? response.data : p));
    } catch (err) {
      // Offline fallback
      setProjects(projects.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
    }
  };

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
    setPriority(project.priority);
    setBudget(project.budget.toString());
    setDeadline(project.deadline);
    setColorLabel(project.colorLabel || '#3B82F6');
    setAddedEmails([]);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingProject(null);
    setName('');
    setDescription('');
    setStatus('ACTIVE');
    setPriority('MEDIUM');
    setBudget('10000');
    setDeadline('');
    setColorLabel('#3B82F6');
    setAddedEmails([]);
    setIsModalOpen(true);
  };

  const deleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/api/projects/${id}`);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditMode && editingProject) {
      const payload = {
        id: editingProject.id,
        name,
        description,
        status,
        priority,
        budget: parseFloat(budget),
        deadline: deadline || editingProject.deadline,
        colorLabel,
        spent: editingProject.spent,
        isFavorite: editingProject.isFavorite
      };
      try {
        await api.put(`/api/projects/${editingProject.id}`, payload);
        fetchProjects();
      } catch (err) {
        setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...payload } : p));
      }
      setIsModalOpen(false);
      return;
    }

    const payload = {
      name,
      description,
      status,
      priority,
      budget: parseFloat(budget),
      deadline: deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      colorLabel,
      spent: 0
    };

    try {
      const response = await api.post('/api/projects', payload);
      const savedProj = response.data;
      
      // Add members if any specified
      for (const email of addedEmails) {
        try {
          await api.post(`/api/projects/${savedProj.id}/members?email=${email}`);
        } catch (err) {
          console.error('Failed to add project member', email);
        }
      }
      
      fetchProjects();
    } catch (err) {
      // Offline fallback
      const newProj: Project = {
        id: Date.now(),
        ...payload,
        isFavorite: false,
        membersCount: addedEmails.length + 1
      };
      setProjects([newProj, ...projects]);
    }

    // Reset form
    setName('');
    setDescription('');
    setStatus('ACTIVE');
    setPriority('MEDIUM');
    setBudget('10000');
    setDeadline('');
    setColorLabel('#3B82F6');
    setAddedEmails([]);
    setIsModalOpen(false);
  };

  const addMemberEmail = () => {
    if (memberEmail.trim() && memberEmail.includes('@') && !addedEmails.includes(memberEmail)) {
      setAddedEmails([...addedEmails, memberEmail.trim()]);
      setMemberEmail('');
    }
  };

  const removeAddedEmail = (email: string) => {
    setAddedEmails(addedEmails.filter(e => e !== email));
  };

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] select-none overflow-hidden pb-4">
      {/* Title Header - Constant */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/10 dark:border-white/5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
            Projects Portfolio
          </h1>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Build, edit, and assign members to your enterprise workspaces.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {/* Scrollable Content (Filters + Projects list) */}
      <div className="flex-1 overflow-y-auto mt-6 space-y-6 pr-1">
        {/* Filters & View Switches bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 border border-slate-200/50 dark:border-white/5 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
            />
          </div>

          {/* Status filter selection */}
          <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl">
            {['ALL', 'PLANNING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'].map(statusVal => (
              <button
                key={statusVal}
                onClick={() => setStatusFilter(statusVal)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                  statusFilter === statusVal
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {statusVal}
              </button>
            ))}
          </div>
        </div>

        {/* Layout grid/list switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGridView(true)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/50 dark:border-white/5 cursor-pointer transition-colors ${
              isGridView ? 'bg-blue-600 text-white' : 'bg-slate-100/50 dark:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setIsGridView(false)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200/50 dark:border-white/5 cursor-pointer transition-colors ${
              !isGridView ? 'bg-blue-600 text-white' : 'bg-slate-100/50 dark:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <List className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Projects Presentation */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-16 text-center text-slate-400 text-sm font-bold flex flex-col items-center gap-3">
          <FolderGit2 className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse" />
          No projects matching your search parameters were found.
        </div>
      ) : isGridView ? (
        // Grid View layout
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(project => {
            const pct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
            return (
              <motion.div
                key={project.id}
                layout
                onClick={() => setView('boards', project.id)}
                className="glass-panel glass-panel-hover p-6 flex flex-col justify-between h-64 cursor-pointer relative"
              >
                {/* Color label tag indicator */}
                <div
                  className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl"
                  style={{ backgroundColor: project.colorLabel || '#3B82F6' }}
                ></div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                      project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                      project.status === 'PLANNING' ? 'bg-slate-500/10 text-slate-400' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {project.status}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => toggleFavorite(project.id, e)}
                        className={`p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer ${project.isFavorite ? 'text-amber-500' : 'text-slate-400'}`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={(e) => openEditModal(project, e)}
                        className="p-1 rounded-lg hover:bg-white/15 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-1">{project.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{project.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Budget tracking progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>Budget: ${project.spent} / ${project.budget}</span>
                      <span>{pct}% spent</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-200/30 dark:border-white/5 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Due {project.deadline}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {project.membersCount || 1} team
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // List View layout
        <div className="glass-panel overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
          {filtered.map(project => {
            const pct = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;
            return (
              <div
                key={project.id}
                onClick={() => setView('boards', project.id)}
                className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.colorLabel || '#3B82F6' }}></div>
                  <div className="truncate">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">{project.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{project.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase hidden sm:inline-block ${
                    project.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {project.status}
                  </span>

                  <span className="text-xs font-bold text-slate-500 hidden md:inline-block">
                    Budget: ${project.spent} / ${project.budget}
                  </span>

                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {project.deadline}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => toggleFavorite(project.id, e)}
                      className={`p-1 rounded hover:bg-white/10 ${project.isFavorite ? 'text-amber-500' : 'text-slate-400'}`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                    <button
                      onClick={(e) => openEditModal(project, e)}
                      className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-blue-500"
                      title="Edit Project"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="p-1 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel w-full max-w-lg p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <FolderGit2 className="w-5 h-5 text-blue-500" /> {isEditMode ? 'Edit Project Workspace' : 'Initialize New Project Workspace'}
              </h2>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prologue mobile app"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Provide context and milestone targets..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                    >
                      <option className="dark:bg-slate-800" value="PLANNING">Planning</option>
                      <option className="dark:bg-slate-800" value="ACTIVE">Active</option>
                      <option className="dark:bg-slate-800" value="COMPLETED">Completed</option>
                      <option className="dark:bg-slate-800" value="ARCHIVED">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                    >
                      <option className="dark:bg-slate-800" value="LOW">Low</option>
                      <option className="dark:bg-slate-800" value="MEDIUM">Medium</option>
                      <option className="dark:bg-slate-800" value="HIGH">High</option>
                      <option className="dark:bg-slate-800" value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Budget ($)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        placeholder="10000"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Deadline</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Label templates picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Workspace Tag Color</label>
                  <div className="flex gap-2.5">
                    {['#3B82F6', '#6366F1', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444'].map(color => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setColorLabel(color)}
                        className="w-6 h-6 rounded-full border border-white/20 relative cursor-pointer"
                        style={{ backgroundColor: color }}
                      >
                        {colorLabel === color && <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Team invites */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Invite Team Members</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                    <button
                      type="button"
                      onClick={addMemberEmail}
                      className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      Invite
                    </button>
                  </div>
                  
                  {addedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pt-1">
                      {addedEmails.map(email => (
                        <span key={email} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-black border border-blue-500/15">
                          {email}
                          <button type="button" onClick={() => removeAddedEmail(email)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 justify-end border-t border-slate-200/30 dark:border-white/5 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition-colors"
                  >
                    {isEditMode ? 'Save Workspace Changes' : 'Initialize Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
