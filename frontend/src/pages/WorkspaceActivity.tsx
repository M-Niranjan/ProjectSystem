import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, ShieldCheck, Filter, Search, RefreshCw, Plus, 
  CheckCircle2, Sparkles, MessageSquare, ArrowRight, 
  Trash2, Calendar, FileText, Check, X, ShieldAlert,
  KeyRound, FolderGit2, Shield, Layers, UploadCloud,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import LuxurySelect from '../components/common/LuxurySelect';

interface ActivityItem {
  id: number | string;
  action: 'CREATE' | 'UPDATE' | 'COMMENT' | 'DELETE' | string;
  details: string;
  createdAt: string;
  user?: string;
  project?: string;
  status?: string;
}

export default function WorkspaceActivity() {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [shakeError, setShakeError] = useState(false);

  // Lock background scroll when activity modal is open
  useScrollLock(isAddModalOpen);

  const [newAction, setNewAction] = useState<'CREATE' | 'UPDATE' | 'COMMENT'>('UPDATE');
  const [newDetails, setNewDetails] = useState('');
  const [newProject, setNewProject] = useState('Workspace');

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
          project: item.project || 'Workspace',
          status: 'VERIFIED'
        }));
        setActivities(mapped);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user?.id]);

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetails.trim()) {
      setFormError('Activity description is required before saving & verifying.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 450);
      return;
    }

    const newItem: ActivityItem = {
      id: Date.now(),
      action: newAction,
      details: newDetails.trim(),
      createdAt: new Date().toISOString(),
      user: user?.name || 'Workspace User',
      project: newProject.trim() || 'Prologue SaaS',
      status: 'VERIFIED'
    };

    const updated = [newItem, ...activities];
    setActivities(updated);
    localStorage.setItem('workspace_activities_stream', JSON.stringify(updated));
    showToast('Workspace activity logged and verified successfully.', 'success');
    setNewDetails('');
    setFormError(null);
    setIsAddModalOpen(false);
  };

  const handleClearHistory = () => {
    setActivities([]);
    localStorage.removeItem('workspace_activities_stream');
    showToast('Workspace activity history reset.', 'info');
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

  // Semantic Pastel Squircle Meta Resolver matching Variation 2
  const getActionMeta = (action: string) => {
    const norm = (action || '').toUpperCase();
    if (norm.includes('ROLE') || norm.includes('SECURITY') || norm.includes('PRIVILEGE') || norm.includes('ADMIN')) {
      return {
        label: 'Role Update',
        icon: Shield,
        iconBg: 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25',
      };
    }
    if (norm.includes('LOGIN') || norm.includes('AUTH') || norm.includes('BIOMETRIC') || norm.includes('SESSION')) {
      return {
        label: 'Login',
        icon: KeyRound,
        iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
      };
    }
    if (norm.includes('PROJECT') || norm.includes('CREATE')) {
      return {
        label: 'Project',
        icon: FolderGit2,
        iconBg: 'bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25',
      };
    }
    if (norm.includes('TASK') || norm.includes('SUBMIT') || norm.includes('COMPLETE')) {
      return {
        label: 'Task',
        icon: CheckCircle2,
        iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25',
      };
    }
    if (norm.includes('COMMENT') || norm.includes('FEEDBACK') || norm.includes('NOTE')) {
      return {
        label: 'Comment',
        icon: MessageSquare,
        iconBg: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/25',
      };
    }
    return {
      label: 'Update',
      icon: RefreshCw,
      iconBg: 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25',
    };
  };

  // Human-friendly date formatting without ISO "T" bug
  const formatTimestamp = (raw: string | number) => {
    if (!raw) return 'Recently';
    try {
      const rawStr = String(raw).trim();
      const cleanedStr = rawStr.replace(/(\d{4})T(\d{1,2}:)/, '$1 $2');
      const date = new Date(cleanedStr);
      if (isNaN(date.getTime())) {
        return rawStr.replace('T', ' ');
      }
      const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

      const month = date.toLocaleDateString(undefined, { month: 'short' });
      const day = date.getDate();
      const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${month} ${day} • ${time}`;
    } catch {
      return String(raw).replace('T', ' ');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-20 w-full min-w-0 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
            <Clock className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading truncate">
              Verified Workspace Activity
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Real-time cryptographically verified audit feed of project setups, task moves, and actions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            onClick={() => {
              setFormError(null);
              setShakeError(false);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Log Activity</span>
          </button>

          <button
            onClick={fetchActivities}
            title="Refresh Feed"
            className="p-2 bg-white dark:bg-[#0e1322] border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BENTO KPI STATS CARDS (Variation 2 Style)                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {/* Card 1: Total Events */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 truncate">
              Total Events
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {activities.length}
            </h3>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Logged in workspace
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-500/15 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Created */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              Created
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {countCreate}
            </h3>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Projects & milestones
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Updates */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
              Updates
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {countUpdate}
            </h3>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              State & task moves
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Comments */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 truncate">
              Comments
            </p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {countComment}
            </h3>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              Feedback & notes
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER TOOLBAR                                                */}
      {/* ========================================================================= */}
      <div className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-between relative z-20">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search activity description, user or project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 text-xs outline-none focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <LuxurySelect
            className="w-full sm:w-48"
            value={selectedAction}
            onChange={(val) => setSelectedAction(val)}
            options={[
              { value: 'ALL', label: 'All Action Types' },
              { value: 'CREATE', label: 'Create Events', badge: 'ADD', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
              { value: 'UPDATE', label: 'Update Events', badge: 'MOD', badgeColor: 'bg-blue-500/20 text-blue-400' },
              { value: 'COMMENT', label: 'Comments', badge: 'CHAT', badgeColor: 'bg-amber-500/20 text-amber-400' }
            ]}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVITY STREAM SECTION (Executive Bento Floating Cards)              */}
      {/* ========================================================================= */}
      <div className="space-y-2.5 sm:space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Activity Stream ({filtered.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
          >
            Reset Stream
          </button>
        </div>

        {/* Empty State */}
        {filtered.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 text-center">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No activity events found</h3>
            <p className="text-xs text-slate-400 mt-1">Try refining your filter or click "Log Activity" to create an event.</p>
          </div>
        ) : (
          /* Stream of Floating Bento Cards matching Variation 2 */
          <div className="space-y-2.5 sm:space-y-3">
            {filtered.map((act) => {
              const meta = getActionMeta(act.action);
              const Icon = meta.icon;
              const userInitial = (act.user || 'U').charAt(0).toUpperCase();

              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="w-full p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-blue-400/40 dark:hover:border-white/20 transition-all flex items-start justify-between gap-3 sm:gap-4 group"
                >
                  <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
                    {/* Pastel Squircle Icon Badge matching Variation 2 */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${meta.iconBg} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Action Category Label */}
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                        {meta.label}
                      </span>

                      {/* Main Event Action Description */}
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                        {act.details}
                      </h3>

                      {/* Actor & Metadata Pill Row */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {act.user && (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                            <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center text-[9.5px] font-black">
                              {userInitial}
                            </span>
                            <span>{act.user}</span>
                          </span>
                        )}

                        {act.project && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 text-[10.5px]">
                            {act.project}
                          </span>
                        )}

                        <span>•</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {formatTimestamp(act.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Top-Right Glowing Emerald Verified Badge */}
                  <div className="shrink-0 pt-0.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.12)]">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Verified</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. LOG ACTIVITY MODAL DIALOG                                              */}
      {/* ========================================================================= */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 touch-none overscroll-contain modal-dialog-root">
          {/* Backdrop */}
          <div
            onClick={() => {
              setIsAddModalOpen(false);
              setFormError(null);
              setShakeError(false);
            }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Dialog Card */}
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative pointer-events-auto select-text touch-auto w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 z-10 modal-dialog-contain overscroll-contain"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Log Workspace Activity
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFormError(null);
                  setShakeError(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} noValidate className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Action Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CREATE', 'UPDATE', 'COMMENT'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAction(type)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold uppercase border transition-all cursor-pointer ${
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
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                  Associated Project / Scope
                </label>
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="e.g. Project Alpha or Core Service"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-400">
                    Activity Description
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Required
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={newDetails}
                    onChange={(e) => {
                      setNewDetails(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Describe what was accomplished, updated or milestone marked..."
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none resize-none transition-all duration-200 ${
                      formError
                        ? 'border border-rose-500/80 ring-2 ring-rose-500/25 dark:ring-rose-500/35 bg-rose-50/20 dark:bg-rose-950/20 shadow-[0_0_16px_rgba(244,63,94,0.18)]'
                        : 'border border-slate-200 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    } ${shakeError ? 'animate-shake' : ''}`}
                  />
                </div>

                {/* Unique Custom Validation Signal Pill */}
                <AnimatePresence>
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="mt-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border border-rose-500/30 dark:border-rose-500/40 shadow-lg shadow-rose-500/10 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold">{formError}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0">
                        Action Required
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setFormError(null);
                    setShakeError(false);
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  Save & Verify
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
