import { getAvatarByName } from '../services/avatar';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            onKeyDown={handleKeyDownBack}
            tabIndex={0}
            aria-label="Back to Work Tracking"
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/10 text-slate-700 dark:text-white rounded-xl transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-md">
                EMP-{profile.id}
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Employee Work Profile & Capacity Inspection
              </h1>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Detailed task contributions, sequential step approvals, capacity utilization, and work history.
            </p>
          </div>
        </div>
      </div>

      {/* Main Employee Profile Banner Card */}
      <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Professional Details */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <img
                src={profile.profilePhoto || getAvatarByName(profile.name)}
                alt="avatar"
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/20 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" title="Status: Online" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{profile.name}</h2>
                <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-500 font-extrabold text-[10px] rounded-lg uppercase tracking-wider border border-blue-500/20">
                  {profile.designation}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${getWorkloadBadge(profile.workloadLevel)}`}>
                  {profile.workloadLevel} WORKLOAD
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Dept: {profile.department}
                </span>
                <span className="flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-purple-500" /> Project: {profile.currentProject}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Team Lead: Niranjan M (Lead)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="p-3.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl text-center space-y-1 min-w-[110px]">
              <span className="text-[10px] font-black uppercase text-slate-400">Completion Rate</span>
              <p className="text-xl font-black text-emerald-500">{profile.completionRate}%</p>
            </div>
          </div>
        </div>

        {/* Capacity Warning Alert Banner if Overloaded */}
        {profile.warningMessage && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-bold text-rose-500 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-black">Capacity Overload Warning</p>
              <p className="font-semibold text-rose-400">{profile.warningMessage}</p>
            </div>
          </div>
        )}

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400">Assigned Tasks</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{profile.assignedTasksCount}</p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-emerald-500">Completed</p>
            <p className="text-2xl font-black text-emerald-500">{profile.completedTasksCount}</p>
          </div>
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-blue-500">In Progress</p>
            <p className="text-2xl font-black text-blue-500">{profile.inProgressTasksCount}</p>
          </div>
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-rose-500">Overdue Risks</p>
            <p className="text-2xl font-black text-rose-500">{profile.overdueTasksCount}</p>
          </div>
          <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1">
            <p className="text-[10px] font-black uppercase text-purple-500">Active Blockers</p>
            <p className="text-2xl font-black text-purple-500">{(profile.blockersList || []).length}</p>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/10 pb-2">
        {[
          { id: 'tasks', label: `Assigned Tasks (${(profile?.tasksList || []).length})`, icon: Layers },
          { id: 'steps', label: `Sequential Steps (${(stepPipeline || []).length})`, icon: ShieldCheck },
          { id: 'blockers', label: `Reported Blockers (${(profile?.blockersList || []).length})`, icon: AlertTriangle },
          { id: 'activity', label: `Work History Stream (${(profile?.recentActivity || []).length})`, icon: Activity },
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer outline-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ASSIGNED TASKS */}
      {activeTab === 'tasks' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-500" /> Active Assigned Tasks ({(profile?.tasksList || []).length})
          </h3>

          <div className="space-y-3">
            {(profile?.tasksList || []).length > 0 ? (
              (profile?.tasksList || []).map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-blue-500/30 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-xs">{t.title}</h4>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t.description || 'No description provided.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-400 pt-1">
                      <span>Due: {t.dueDate || 'N/A'}</span>
                      <span>•</span>
                      <span>Priority: <strong className="text-amber-500">{t.priority || 'NORMAL'}</strong></span>
                      <span>•</span>
                      <span>Project: {t.project?.name || t.project?.title || profile?.currentProject || 'Project'}</span>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider shrink-0 text-center ${
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
              <p className="text-xs text-slate-400 italic p-6 text-center bg-white/5 rounded-2xl">
                No active tasks currently assigned to {profile?.name || 'this employee'}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEQUENTIAL STEPS */}
      {activeTab === 'steps' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sequential Task Step Approval Pipeline ({stepPipeline.length})
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
                    className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-black text-xs text-slate-900 dark:text-white">
                        Step {step.stepNumber}: {step.title}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {step.objective}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        Expected Output: <span className="text-slate-300">{step.expectedOutput}</span> • Deadline: {step.deadline}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-wider shrink-0 text-center ${
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
              <p className="text-xs text-slate-400 italic p-6 text-center bg-white/5 rounded-2xl">
                No active sequential step pipelines configured for this employee's tasks.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BLOCKERS */}
      {activeTab === 'blockers' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Reported Technical Blockers ({(profile.blockersList || []).length})
          </h3>

          <div className="space-y-3">
            {(profile.blockersList || []).length > 0 ? (
              (profile.blockersList || []).map((b: any) => (
                <div key={b.id} className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between font-black text-slate-900 dark:text-white">
                    <span>{b.title}</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded uppercase">
                      {b.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-350 font-semibold">{b.description}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-6 text-center bg-white/5 rounded-2xl">
                No active technical blockers reported by {profile.name}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY STREAM */}
      {activeTab === 'activity' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/10 rounded-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-500" /> Recent Work History Stream ({(profile.recentActivity || []).length})
          </h3>

          <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-white/10">
            {(profile.recentActivity || []).length > 0 ? (
              (profile.recentActivity || []).map((act: any) => (
                <div key={act.id} className="relative space-y-1 text-xs">
                  <span className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{act.title || act.details || 'Activity event'}</p>
                      {act.description && <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{act.description}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">{act.timestamp}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-6 text-center bg-white/5 rounded-2xl">
                No recent activity events logged for {profile.name}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
