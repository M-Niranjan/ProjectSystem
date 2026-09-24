import { getAvatarByName, resolveAvatar } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Activity,
  User,
  Briefcase,
  Mail,
  FolderGit2,
  Calendar,
  FileText,
  Shield,
  Sparkles,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { getEmployeeProfileById, EmployeeProfileData } from '../services/trackingService';
import { getTaskSteps, TaskStep } from '../services/stepVerificationService';
import { useUIStore } from '../store/useUIStore';

export default function EmployeeWorkProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setView } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'steps' | 'blockers' | 'activity'>('tasks');
  const [stepPipeline, setStepPipeline] = useState<TaskStep[]>([]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      if (id) {
        try {
          const data = await getEmployeeProfileById(id);
          setProfile(data);
          if (data) {
            // Load task steps associated with employee's assigned tasks
            let steps: TaskStep[] = [];
            (data.tasksList || []).forEach((t: any) => {
              if (t && t.id) {
                const s = getTaskSteps(t.id);
                if (s) steps = [...steps, ...s];
              }
            });
            setStepPipeline(steps);
          }
        } catch (err) {
          console.error("Error loading employee profile:", err);
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [id]);

  const handleBack = () => {
    setView('team-tracking');
    navigate('/team-tracking');
  };

  const handleKeyDownBack = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBack();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Employee Work Profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 glass-panel border border-slate-200/50 dark:border-white/10 rounded-3xl text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Profile Information Unavailable</h2>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          We could not find work profile records for employee ID <span className="font-mono text-blue-500">{id}</span>. The employee may have been removed or assigned to another department.
        </p>
        <button
          onClick={handleBack}
          onKeyDown={handleKeyDownBack}
          tabIndex={0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Work Tracking
        </button>
      </div>
    );
  }

  // Workload badge color computation
  const getWorkloadBadge = (level: string) => {
    switch (level) {
      case 'OVERLOADED':
        return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'BALANCED':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Top Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <button
            onClick={handleBack}
            onKeyDown={handleKeyDownBack}
            tabIndex={0}
            aria-label="Back to Work Tracking"
            className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none shrink-0 mt-0.5 sm:mt-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md font-mono shrink-0 cursor-default"
                title={`Full ID: ${profile.id}`}
              >
                {String(profile.id).length > 10 ? `EMP-${String(profile.id).slice(0, 6)}...` : `EMP-${profile.id}`}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                Capacity & Performance Inspection
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight break-words">
              Employee Work Profile
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
              Detailed task contributions, sequential step approvals, capacity utilization, and work history.
            </p>
          </div>
        </div>
      </div>

      {/* Main Employee Profile Banner Card */}
      <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Avatar & Professional Details */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
            <div className="relative shrink-0">
              <img
                src={resolveAvatar(profile.profilePhoto, profile.name, (profile as any).gender)}
                alt="avatar"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 sm:ring-4 ring-blue-500/20 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" title="Status: Online" />
            </div>

            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {profile.name}
                </h2>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 font-extrabold text-[10px] sm:text-xs rounded-lg uppercase tracking-wider border border-blue-500/20 shrink-0">
                  {profile.designation ? profile.designation.replace(/DEVOLOPER/i, 'Developer') : 'Software Developer'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border shrink-0 ${getWorkloadBadge(profile.workloadLevel)}`}>
                  {profile.workloadLevel} WORKLOAD
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{profile.department}</strong></span>
                </span>
                <span className="text-slate-300 dark:text-white/20 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span>Project: <strong className="text-slate-700 dark:text-slate-300">{profile.currentProject}</strong></span>
                </span>
                <span className="text-slate-300 dark:text-white/20 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Team Lead: <strong className="text-slate-700 dark:text-slate-300">Niranjan M (Lead)</strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Velocity Progress Gauge */}
          <div className="flex items-center gap-4 bg-white/5 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 p-3.5 rounded-2xl shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Overall Velocity</span>
              <p className="text-base sm:text-lg font-black text-emerald-500">{profile.completionRate}% Completed</p>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{profile.completedTasksCount} of {profile.assignedTasksCount} tasks finished</span>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-white/10"
                  strokeDasharray="100, 100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <path
                  className="text-emerald-500 transition-all duration-700 ease-out"
                  strokeDasharray={`${profile.completionRate}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-900 dark:text-white">{profile.completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Capacity Warning Alert Banner if Overloaded */}
        {profile.warningMessage && (
          <div className="p-3.5 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-500 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-black">Capacity Overload Warning</p>
              <p className="font-semibold text-rose-400">{profile.warningMessage}</p>
            </div>
          </div>
        )}

        {/* 6 Key Metric Cards - Perfectly Balanced Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <div className="p-3 sm:p-3.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{profile.assignedTasksCount}</p>
          </div>
          <div className="p-3 sm:p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-blue-500 tracking-wider">In Progress</p>
            <p className="text-xl sm:text-2xl font-black text-blue-500">{profile.inProgressTasksCount}</p>
          </div>
          <div className="p-3 sm:p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Completed</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-500">{profile.completedTasksCount}</p>
          </div>
          <div className="p-3 sm:p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Overdue</p>
            <p className="text-xl sm:text-2xl font-black text-rose-500">{profile.overdueTasksCount}</p>
          </div>
          <div className="p-3 sm:p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-purple-500 tracking-wider">Blockers</p>
            <p className="text-xl sm:text-2xl font-black text-purple-500">{(profile.blockersList || []).length}</p>
          </div>
          <div className="p-3 sm:p-3.5 bg-teal-500/10 border border-teal-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-teal-500 tracking-wider">Success Rate</p>
            <p className="text-xl sm:text-2xl font-black text-teal-500">{profile.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar with Horizontal Scroll and no Overflow */}
      <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none w-full min-w-0 -mx-1 px-1">
        {[
          { id: 'tasks', label: `Assigned Tasks (${(profile?.tasksList || []).length})`, icon: Layers },
          { id: 'steps', label: `Sequential Steps (${(stepPipeline || []).length})`, icon: ShieldCheck },
          { id: 'blockers', label: `Reported Blockers (${(profile?.blockersList || []).length})`, icon: AlertTriangle },
          { id: 'activity', label: `Work History (${(profile?.recentActivity || []).length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab(tab.id as any);
                }
              }}
              tabIndex={0}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer outline-none shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ASSIGNED TASKS */}
      {activeTab === 'tasks' && (
        <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500 shrink-0" /> Active Assigned Tasks ({(profile?.tasksList || []).length})
          </h3>

          <div className="space-y-3">
            {(profile?.tasksList || []).length > 0 ? (
              (profile?.tasksList || []).map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 sm:p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-500/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm break-words">{t.title}</h4>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">
                      {t.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] font-bold text-slate-400 pt-1">
                      <span>Due: <strong className="text-slate-600 dark:text-slate-300">{t.dueDate || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Priority: <strong className="text-amber-500">{t.priority || 'NORMAL'}</strong></span>
                      <span>•</span>
                      <span>Project: <strong className="text-slate-600 dark:text-slate-300">{t.project?.name || t.project?.title || profile?.currentProject || 'Project'}</strong></span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider shrink-0 self-start sm:self-center text-center ${
                      t.status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}
                  >
                    {(t.status || 'TO_DO').replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 sm:p-12 text-center bg-white/5 dark:bg-white/[0.02] border border-dashed border-slate-200/50 dark:border-white/10 rounded-2xl space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                  No active tasks currently assigned to {profile?.name || 'this employee'}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Tasks assigned to this employee will appear here with real-time status and deadlines.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEQUENTIAL STEPS */}
      {activeTab === 'steps' && (
        <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" /> Sequential Task Step Approval Pipeline ({stepPipeline.length})
          </h3>

          <div className="space-y-3">
            {stepPipeline.length > 0 ? (
              stepPipeline.map((step) => {
                const isApproved = step.status === 'APPROVED_COMPLETED';
                const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
                const isChanges = step.status === 'CHANGES_REQUESTED';

                return (
                  <div
                    key={step.id}
                    className="p-3.5 sm:p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white break-words">
                        Step {step.stepNumber}: {step.title}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 line-clamp-2">
                        {step.objective}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 pt-0.5">
                        Expected Output: <span className="text-slate-600 dark:text-slate-300">{step.expectedOutput}</span> • Deadline: <span className="text-slate-600 dark:text-slate-300">{step.deadline}</span>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-wider shrink-0 self-start sm:self-center text-center ${
                        isApproved
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse'
                          : isChanges
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}
                    >
                      {step.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="p-8 sm:p-12 text-center bg-white/5 dark:bg-white/[0.02] border border-dashed border-slate-200/50 dark:border-white/10 rounded-2xl space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                  No active sequential step pipelines configured.
                </p>
                <p className="text-[11px] text-slate-400">
                  Sequential step verifications required for this employee's tasks will be tracked here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BLOCKERS */}
      {activeTab === 'blockers' && (
        <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" /> Reported Technical Blockers ({(profile.blockersList || []).length})
          </h3>

          <div className="space-y-3">
            {(profile.blockersList || []).length > 0 ? (
              (profile.blockersList || []).map((b: any) => (
                <div key={b.id} className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-black text-slate-900 dark:text-white gap-2">
                    <span className="truncate">{b.title}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded uppercase shrink-0">
                      {b.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-semibold">{b.description}</p>
                </div>
              ))
            ) : (
              <div className="p-8 sm:p-12 text-center bg-white/5 dark:bg-white/[0.02] border border-dashed border-slate-200/50 dark:border-white/10 rounded-2xl space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                  No active technical blockers reported by {profile.name}.
                </p>
                <p className="text-[11px] text-slate-400">
                  All development paths and workflows are operating smoothly without reported impediments.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="glass-panel p-4 sm:p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500 shrink-0" /> Recent Work History Stream ({(profile.recentActivity || []).length})
          </h3>

          <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-white/10 ml-2">
            {(profile.recentActivity || []).length > 0 ? (
              (profile.recentActivity || []).map((act: any) => (
                <div key={act.id} className="relative space-y-1 text-xs">
                  <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900" />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900 dark:text-white">{act.title || act.details || 'Activity event'}</p>
                      {act.description && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{act.description}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">{act.timestamp}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 sm:p-12 text-center bg-white/5 dark:bg-white/[0.02] border border-dashed border-slate-200/50 dark:border-white/10 rounded-2xl space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                  No recent activity events logged for {profile.name}.
                </p>
                <p className="text-[11px] text-slate-400">
                  Task status changes, blocker submissions, and step approvals will appear in this timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
