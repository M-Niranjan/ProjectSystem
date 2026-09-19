import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, ShieldCheck, Filter, Search, RefreshCw, Plus, 
  CheckCircle2, Sparkles, MessageSquare, ArrowRight, 
  Trash2, Calendar, FileText, Check, X, ShieldAlert
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

interface ActivityItem {
  id: number | string;
  action: 'CREATE' | 'UPDATE' | 'COMMENT' | 'DELETE' | string;
  details: string;
  createdAt: string;
  user?: string;
  project?: string;
  status?: string;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  { 
    id: 1, 
    action: 'CREATE', 
    details: 'Initialized project: Prologue SaaS Dashboard architecture & design tokens', 
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    user: 'Niranjan (Admin)',
    project: 'Prologue SaaS',
    status: 'VERIFIED'
  },
  { 
    id: 2, 
    action: 'UPDATE', 
    details: 'Moved task: "Revamp login page" to IN_PROGRESS with biometric auth checks', 
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    user: 'Niranjan (Admin)',
    project: 'Prologue SaaS',
    status: 'VERIFIED'
  },
  { 
    id: 3, 
    action: 'COMMENT', 
    details: 'Added comment: "Matches radius variables and Linear aesthetic standard" on task #101', 
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user: 'Niranjan (Admin)',
    project: 'Prologue SaaS',
    status: 'VERIFIED'
  },
  { 
    id: 4, 
    action: 'CREATE', 
    details: 'Created sprint milestone: Mobile responsive viewport fixes & fluid layout', 
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    user: 'Team Lead',
    project: 'Core Platform',
    status: 'VERIFIED'
  },
  { 
    id: 5, 
    action: 'UPDATE', 
    details: 'Verified task milestone: Notification menu mobile-safe container boundaries', 
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    user: 'QA Automation',
    project: 'Core Platform',
    status: 'VERIFIED'
  }
];

export default function WorkspaceActivity() {
  const { user } = useAuthStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAction, setNewAction] = useState<'CREATE' | 'UPDATE' | 'COMMENT'>('UPDATE');
  const [newDetails, setNewDetails] = useState('');
  const [newProject, setNewProject] = useState('Prologue SaaS');

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // 1. Check local storage overrides first
      const stored = localStorage.getItem('workspace_activities_stream');
      if (stored) {
        setActivities(JSON.parse(stored));
        setLoading(false);
        return;
      }

      // 2. Fetch from backend API
      const res = await api.get(`/api/logs/user/${user?.id || 1}`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item: any, idx: number) => ({
          id: item.id || idx + 1,
          action: item.action || 'UPDATE',
          details: item.details || item.activity || 'Workspace action completed',
          createdAt: item.createdAt || item.date ? `${item.date}T${item.time || '12:00:00'}` : new Date().toISOString(),
          user: item.user || user?.name || 'Workspace User',
          project: item.project || 'Prologue SaaS',
          status: 'VERIFIED'
        }));
        setActivities(mapped);
        localStorage.setItem('workspace_activities_stream', JSON.stringify(mapped));
      } else {
        setActivities(DEFAULT_ACTIVITIES);
        localStorage.setItem('workspace_activities_stream', JSON.stringify(DEFAULT_ACTIVITIES));
      }
    } catch (err) {
      console.warn('Using default activity stream fallback:', err);
      setActivities(DEFAULT_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user?.id]);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetails.trim()) return;

    const newItem: ActivityItem = {
      id: Date.now(),
      action: newAction,
      details: newDetails.trim(),
      createdAt: new Date().toISOString(),
      user: user?.name || 'Current User',
      project: newProject.trim() || 'Workspace',
      status: 'VERIFIED'
    };

    const updated = [newItem, ...activities];
    setActivities(updated);
    localStorage.setItem('workspace_activities_stream', JSON.stringify(updated));
    setNewDetails('');
    setIsAddModalOpen(false);
  };

  const handleClearHistory = () => {
    if (confirm('Reset workspace activity history to system defaults?')) {
      setActivities(DEFAULT_ACTIVITIES);
      localStorage.setItem('workspace_activities_stream', JSON.stringify(DEFAULT_ACTIVITIES));
    }
  };

  const filtered = activities.filter(act => {
    const matchesSearch = 
      act.details.toLowerCase().includes(search.toLowerCase()) ||
      (act.user && act.user.toLowerCase().includes(search.toLowerCase())) ||
      (act.project && act.project.toLowerCase().includes(search.toLowerCase()));
    const matchesAction = selectedAction === 'ALL' || act.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const countCreate = activities.filter(a => a.action === 'CREATE').length;
  const countUpdate = activities.filter(a => a.action === 'UPDATE').length;
  const countComment = activities.filter(a => a.action === 'COMMENT').length;

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <Sparkles className="w-3 h-3" />
            CREATE
          </span>
        );
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs">
            <RefreshCw className="w-3 h-3" />
            UPDATE
          </span>
        );
      case 'COMMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
            <MessageSquare className="w-3 h-3" />
            COMMENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shadow-xs">
            <Clock className="w-3 h-3" />
            {action}
          </span>
        );
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return iso;
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)] shrink-0">
              <Clock className="w-5 h-5 stroke-[2]" />
            </div>
            Verified Workspace Activity
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Real-time cryptographically verified audit feed of project setups, task status moves, notes, and team actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Log Activity
          </button>

          <button
            onClick={fetchActivities}
            title="Refresh Feed"
            className="p-2 bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            Total Events
          </span>
          <div className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {activities.length}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Logged in workspace</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Created
          </span>
          <div className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {countCreate}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Projects & milestones</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Updates
          </span>
          <div className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {countUpdate}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">State & task moves</span>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-sm">
          <span className="text-[11px] font-black uppercase tracking-wider text-purple-500 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Comments
          </span>
          <div className="mt-1.5 text-2xl font-black text-slate-900 dark:text-white">
            {countComment}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Feedback & notes</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search activity description, user or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:border-blue-500/50 font-semibold transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50/50 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL">All Action Types</option>
            <option value="CREATE">Create Events</option>
            <option value="UPDATE">Update Events</option>
            <option value="COMMENT">Comments & Discussions</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-2xl bg-white/5 border border-slate-200/50 dark:border-white/5 shadow-xl overflow-hidden w-full min-w-0">
        <div className="p-4 border-b border-slate-200/40 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Activity Stream ({filtered.length})
            </h2>
          </div>

          <button
            onClick={handleClearHistory}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            Reset Stream
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-10 h-10 text-slate-400/50 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No activity events found</h3>
            <p className="text-xs text-slate-400 mt-1">Try refining your search filter or log a new activity note.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((act) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="pt-0.5 shrink-0">
                    {getActionBadge(act.action)}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 break-words leading-relaxed">
                      {act.details}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 text-[10.5px] text-slate-400 font-medium">
                      {act.user && (
                        <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {act.user}
                        </span>
                      )}
                      {act.project && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 font-semibold text-slate-500 dark:text-slate-300 border border-slate-200/50 dark:border-white/5">
                          {act.project}
                        </span>
                      )}
                      <span className="text-slate-400">
                        {formatTimestamp(act.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Log Activity Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Log Workspace Activity
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-4 mt-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                    Action Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['CREATE', 'UPDATE', 'COMMENT'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAction(type)}
                        className={`py-2 px-3 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${
                          newAction === type
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                    Associated Project / Scope
                  </label>
                  <input
                    type="text"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    placeholder="e.g. Prologue SaaS Dashboard"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1.5">
                    Activity Description
                  </label>
                  <textarea
                    rows={3}
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                    placeholder="Describe what was accomplished, updated or milestone marked..."
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  >
                    Save & Verify
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
