import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Activity,
  FileText,
  UserCheck,
  Search,
  Filter,
  ArrowRight,
  Eye,
  MessageSquare,
  Lock,
  Layers,
  Sparkles,
  BarChart3,
  X,
  FileCode,
  Check,
  RotateCcw,
  FolderGit2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { formatRoleName } from '../services/authRoles';
import { useScrollLock } from '../hooks/useScrollLock';
import api from '../services/api';
import {
  useStepVerificationStore,
  TaskStep,
  StepAuditLog,
  StepNotification,
} from '../store/useStepVerificationStore';
import {
  getTaskSteps,
  calculateStepProgress,
  verifyStepWork,
  getStepAuditLogs,
  getStepNotifications,
} from '../services/stepVerificationService';
import PremiumPdfViewerModal from '../components/common/PremiumPdfViewerModal';
import TaskPdfUploader from '../components/TaskPdfUploader';

interface ParentTaskMeta {
  id: number;
  title: string;
  project: string;
  shortProject?: string;
  owner: string;
  startDate: string;
  dueDate: string;
  currentStageText?: string;
  milestones: { step: string; name: string; status: 'APPROVED' | 'ACTIVE' | 'LOCKED' }[];
}

export default function StepVerificationDashboard() {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { activeTab, setActiveTab } = useStepVerificationStore();

  const isTeamLeader = !user || user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  // Active Selected Parent Task for the Stepper Ribbon (or 'ALL')
  const [selectedTaskId, setSelectedTaskId] = useState<number | 'ALL'>('ALL');

  // Real tasks from API
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTaskSteps, setAllTaskSteps] = useState<TaskStep[]>([]);
  const [auditLogs, setAuditLogs] = useState<StepAuditLog[]>([]);
  const [notifications, setNotifications] = useState<StepNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Step for Inspection Modal
  const [inspectingStep, setInspectingStep] = useState<TaskStep | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Premium PDF Viewer State
  const [pdfViewerState, setPdfViewerState] = useState<{
    isOpen: boolean;
    pdfUrl: string;
    fileName: string;
    fileSize?: string;
    version?: string;
    uploadedBy?: string;
    uploadedAt?: string;
    isVerified?: boolean;
  }>({
    isOpen: false,
    pdfUrl: '',
    fileName: '',
  });

  const openPdfViewer = (
    url: string,
    name: string,
    opts?: { fileSize?: string; version?: string; uploadedBy?: string; uploadedAt?: string; isVerified?: boolean }
  ) => {
    setPdfViewerState({
      isOpen: true,
      pdfUrl: url,
      fileName: name,
      fileSize: opts?.fileSize || '2.4 MB',
      version: opts?.version || 'Version 1',
      uploadedBy: opts?.uploadedBy || 'Member',
      uploadedAt: opts?.uploadedAt || new Date().toISOString(),
      isVerified: opts?.isVerified ?? true,
    });
  };

  // Freeze background completely when step inspection modal is open
  useScrollLock(!!inspectingStep || pdfViewerState.isOpen);

  const loadData = async () => {
    try {
      const res = await api.get('/api/tasks');
      const taskList = res.data || [];
      setTasks(taskList);

      let combinedSteps: TaskStep[] = [];
      taskList.forEach((t: any) => {
        combinedSteps = [...combinedSteps, ...getTaskSteps(t.id)];
      });

      // Role-based scoping: Employees see only their assigned steps; TL sees all steps
      if (user && !isTeamLeader) {
        combinedSteps = combinedSteps.filter(
          (s) => s.evidence?.submittedBy?.id === user?.id || s.evidence?.submittedBy?.name === user?.name
        );
      }

      setAllTaskSteps(combinedSteps);
      setAuditLogs(getStepAuditLogs());
      setNotifications(getStepNotifications(user?.role));
    } catch (err) {
      setTasks([]);
      setAllTaskSteps([]);
      setAuditLogs(getStepAuditLogs());
      setNotifications(getStepNotifications(user?.role));
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.role, isTeamLeader]);

  // Filtered Task Steps
  const filteredSteps = allTaskSteps.filter((s) => {
    if (selectedTaskId !== 'ALL' && s.taskId !== selectedTaskId) return false;
    if (activeTab === 'pending' && s.status !== 'PENDING_APPROVAL' && s.status !== 'SUBMITTED_FOR_REVIEW') return false;
    if (activeTab === 'changes' && s.status !== 'CHANGES_REQUESTED') return false;
    if (activeTab === 'approved' && s.status !== 'APPROVED_COMPLETED') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchObjective = s.objective.toLowerCase().includes(q);
      const matchSubmitter = s.evidence?.submittedBy?.name?.toLowerCase().includes(q) || false;
      const matchOutput = s.expectedOutput?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchObjective && !matchSubmitter && !matchOutput) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalStepsCount = allTaskSteps.length;
  const approvedStepsCount = allTaskSteps.filter((s) => s.status === 'APPROVED_COMPLETED').length;
  const pendingStepsCount = allTaskSteps.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'SUBMITTED_FOR_REVIEW').length;
  const changesRequestedCount = allTaskSteps.filter((s) => s.status === 'CHANGES_REQUESTED').length;

  const getParentTaskMeta = (task: any): ParentTaskMeta => {
    const steps = getTaskSteps(task.id);
    const approvedCount = steps.filter((s) => s.status === 'APPROVED_COMPLETED').length;
    
    const milestones = steps.length > 0 
      ? steps.map((s) => ({
          step: s.stepNumber < 10 ? `0${s.stepNumber}` : `${s.stepNumber}`,
          name: s.title,
          status: s.status === 'APPROVED_COMPLETED' ? ('APPROVED' as const) : s.status === 'LOCKED' ? ('LOCKED' as const) : ('ACTIVE' as const),
        }))
      : [
          { step: '01', name: 'Planning & Setup', status: 'ACTIVE' as const },
          { step: '02', name: 'Execution', status: 'LOCKED' as const },
          { step: '03', name: 'Review & QA', status: 'LOCKED' as const },
          { step: '04', name: 'Final Sign-off', status: 'LOCKED' as const },
        ];

    const currentStageText = steps.length > 0 
      ? `Stage ${Math.min(approvedCount + 1, steps.length)} of ${steps.length}: ${steps.find((s) => s.status !== 'APPROVED_COMPLETED')?.title || 'Completed'}`
      : 'Sequential Milestones Active';

    return {
      id: task.id,
      title: task.title,
      project: task.project?.name || 'Workspace Project',
      shortProject: task.project?.name || 'Project',
      owner: task.assignee?.name || 'Unassigned',
      startDate: task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : '—',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '—',
      currentStageText,
      milestones,
    };
  };

  const selectedTaskObj = tasks.find((t) => t.id === selectedTaskId);
  const currentTaskMeta = selectedTaskObj ? getParentTaskMeta(selectedTaskObj) : tasks.length > 0 ? getParentTaskMeta(tasks[0]) : null;

  // Handle Team Leader Verification Action
  const handleVerifyAction = async (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT') => {
    if (!inspectingStep) return;

    try {
      const res = await verifyStepWork(
        inspectingStep.id,
        action,
        { id: user?.id || 0, name: user?.name || 'Admin' },
        reviewerNotes
      );

      if (action === 'APPROVE') {
        showToast(
          `Step ${inspectingStep.stepNumber} APPROVED! ${
            res.unlockedStep ? `Step ${res.unlockedStep.stepNumber} is now UNLOCKED.` : 'All steps completed.'
          }`,
          'success'
        );
      } else if (action === 'REQUEST_CHANGES') {
        showToast(`Requested revisions on Step ${inspectingStep.stepNumber}.`, 'info');
      } else {
        showToast(`Step ${inspectingStep.stepNumber} REJECTED.`, 'error');
      }

      setInspectingStep(null);
      setReviewerNotes('');
      loadData();
    } catch (err) {
      showToast('Failed to process verification decision.', 'error');
    }
  };

  const resolveAttachmentUrl = (attName: string, step?: TaskStep) => {
    if (!attName) return '';
    if (attName.startsWith('http://') || attName.startsWith('https://') || attName.startsWith('blob:') || attName.startsWith('data:')) {
      return attName;
    }

    // 1. Check if step has stored evidence downloadUrl or if taskSubmissions has it in localStorage
    if (step) {
      try {
        const localKey = `task_pdf_sub_${step.taskId}_${step.id}`;
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const subs = JSON.parse(cached);
          const match = subs.find((s: any) => s.fileName === attName || s.storedFileName === attName);
          if (match?.downloadUrl) return match.downloadUrl;
        }
      } catch {}
    }

    // 2. Direct public file match for Architecture_v1.2.pdf
    if (attName === 'Architecture_v1.2.pdf') {
      return '/Architecture_v1.2.pdf';
    }

    const clean = attName.replace(/^\/uploads\//, '').replace(/^\//, '');
    return `/uploads/${clean}`;
  };

  const getDeliverableBadge = (step: TaskStep) => {
    if (step.evidence?.attachments && step.evidence.attachments.length > 0) {
      const att = step.evidence.attachments[0];
      const isPdf = att.toLowerCase().endsWith('.pdf');
      const isFig = att.toLowerCase().endsWith('.fig');
      const isDoc = att.toLowerCase().endsWith('.docx') || att.toLowerCase().endsWith('.doc');
      const isZip = att.toLowerCase().endsWith('.zip');
      const fileSize = isPdf ? '2.4 MB' : isZip ? '12.1 MB' : isFig ? '45 MB' : isDoc ? '1.8 MB' : '3.2 MB';

      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            const fileUrl = resolveAttachmentUrl(att, step);
            if (isPdf) {
              openPdfViewer(
                fileUrl,
                att,
                {
                  uploadedBy: step.evidence?.submittedBy?.name || 'Ram',
                  isVerified: step.status === 'APPROVED_COMPLETED',
                }
              );
            } else {
              window.open(fileUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          className="group/file inline-flex items-center gap-2.5 py-1 text-left cursor-pointer"
          title={`Click to view ${att}`}
        >
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-black shrink-0 transition-transform group-hover/file:scale-105 ${
            isPdf ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
            isFig ? 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' :
            isDoc ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
            isZip ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
          }`}>
            {isPdf ? 'PDF' : isFig ? 'FIG' : isDoc ? 'DOC' : isZip ? 'ZIP' : 'FILE'}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="truncate max-w-[155px] text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors group-hover/file:text-blue-600 dark:group-hover/file:text-blue-400 group-hover/file:underline">
              {att}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-tight">{fileSize}</span>
          </div>
        </div>
      );
    }

    if (step.status === 'APPROVED_COMPLETED') {
      return (
        <div className="inline-flex items-center gap-2.5 py-1 text-left">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-black shrink-0 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            DOC
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Verified Blueprint</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Signed-off</span>
          </div>
        </div>
      );
    }

    if (step.status === 'PENDING_APPROVAL') {
      return (
        <div className="inline-flex items-center gap-2.5 py-1 text-left">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-black shrink-0 bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
            PR
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">PR #42 & Specs</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Ready for Review</span>
          </div>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-2 py-1 text-slate-400 dark:text-slate-500 text-xs">
        <Lock className="w-3.5 h-3.5 shrink-0 opacity-60" />
        <span className="italic text-[11px]">Pending submission</span>
      </div>
    );
  };

  const getStepNumberBadge = (step: TaskStep) => {
    const taskPrefix = step.taskId === 201 ? '2' : '1';
    return `[${taskPrefix}.${step.stepNumber}]`;
  };

  const renderMilestoneStepperRail = (task: ParentTaskMeta) => {
    const approvedCount = task.milestones.filter((m) => m.status === 'APPROVED').length;
    const activeCount = task.milestones.filter((m) => m.status === 'ACTIVE').length;
    const progressPct =
      approvedCount === task.milestones.length
        ? 100
        : approvedCount === 0
        ? activeCount > 0
          ? 18
          : 0
        : Math.min(85, Math.round(((approvedCount + (activeCount > 0 ? 0.45 : 0)) / task.milestones.length) * 100));

    return (
      <div className="py-2 overflow-x-auto custom-scrollbar">
        <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto px-6 min-w-[500px] sm:min-w-0">
          {/* Featherlight 2px connecting rail */}
          <div className="absolute left-10 right-10 top-4 h-[2px] bg-slate-200/80 dark:bg-slate-800 z-0">
            {/* Active progressive glowing bar */}
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Stepper Nodes */}
          {task.milestones.map((m) => {
            const isApproved = m.status === 'APPROVED';
            const isActive = m.status === 'ACTIVE';
            const isLocked = m.status === 'LOCKED';

            return (
              <div key={m.step} className="relative z-10 flex flex-col items-center group">
                {/* Node Dot (compact w-8 h-8) */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs transition-all duration-300 ${
                    isApproved
                      ? 'bg-white dark:bg-[#07080c] border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : isActive
                      ? 'bg-white dark:bg-[#07080c] border-2 border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400 shadow-[0_0_14px_rgba(37,99,235,0.4)] scale-110 font-bold'
                      : 'bg-slate-50 dark:bg-[#07080c] border border-slate-300 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {isApproved ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : isLocked ? (
                    <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <span>{m.step}</span>
                  )}
                </div>

                {/* Node Label Below */}
                <div className="mt-2 text-center max-w-[120px]">
                  <span
                    className={`block text-xs font-semibold tracking-tight truncate ${
                      isActive ? 'text-slate-900 dark:text-white font-bold' : isApproved ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {m.name}
                  </span>
                  <span
                    className={`block text-[10px] font-mono mt-0.5 ${
                      isApproved ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : isActive ? 'text-blue-600 dark:text-cyan-400 font-semibold' : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {isApproved ? 'Verified' : isActive ? 'Active' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTaskSwitcherPills = () => (
    <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-full">
      <button
        onClick={() => setSelectedTaskId('ALL')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
          selectedTaskId === 'ALL'
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Pipelines</span>
      </button>
      {tasks.map((task) => {
        const isSelected = selectedTaskId === task.id;
        return (
          <button
            key={String(task.id)}
            onClick={() => setSelectedTaskId(task.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              isSelected
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <span>Task #{task.id}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 w-full min-w-0">
      
      {/* ========================================================================= */}
      {/* TOP COMMAND HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5 font-heading">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            Task Step Verification & Approval
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-10">
            Sequential milestone gating: Employees submit work proof; Team Leaders inspect & sign-off; unlocks next step automatically.
          </p>
        </div>

        {/* Telemetry Indicator */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.03] text-xs font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span>03:25 PM</span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sequential Gating Active</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP PARENT TASK & SEQUENTIAL MILESTONE STEPPER */}
      {/* ========================================================================= */}
      {tasks.length === 0 ? (
        <div className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-8 sm:p-12 text-center bg-white/40 dark:bg-[#07080c]/30 backdrop-blur-md space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No Step Verification Pipelines Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Sequential milestone tracking will appear here once tasks are created. Team members submit proof of work for each step, and Team Leaders sign off to unlock subsequent stages.
          </p>
        </div>
      ) : selectedTaskId === 'ALL' ? (
        <div className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-5 bg-white/40 dark:bg-[#07080c]/30 backdrop-blur-md space-y-6">
          {/* Top Row: Title, Summary & Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  All Active Pipelines
                </h2>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {tasks.length} Active {tasks.length === 1 ? 'Track' : 'Tracks'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-track sequential verification. Each milestone requires Team Leader sign-off before unlocking subsequent stages.
              </p>
            </div>

            {/* Quick Task Switcher Pills */}
            {renderTaskSwitcherPills()}
          </div>

          {/* Clean Aggregate Stats Strip */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 py-1 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Tracks</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{tasks.length} Tasks</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Milestones</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">{allTaskSteps.length} Gated Stages</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block">Verified</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{approvedStepsCount} Completed</span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 dark:text-amber-400 block">Review Ready</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{pendingStepsCount} Deliverables</span>
            </div>
          </div>

          {/* Pipelines rendered cleanly with featherlight stepper */}
          <div className="divide-y divide-slate-200/60 dark:divide-slate-800/60 pt-1">
            {tasks.map((task) => {
              const meta = getParentTaskMeta(task);
              return (
                <div key={task.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        #{meta.id}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {meta.title}
                      </h3>
                      <span className="text-xs text-slate-400">
                        ({meta.shortProject || meta.project})
                      </span>
                      <span className="text-xs text-slate-500">• Owner: {meta.owner}</span>
                    </div>

                    <button
                      onClick={() => setSelectedTaskId(task.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto"
                    >
                      <span>Focus Track</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {renderMilestoneStepperRail(meta)}
                </div>
              );
            })}
          </div>
        </div>
      ) : currentTaskMeta ? (
        <div className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-5 bg-white/40 dark:bg-[#07080c]/30 backdrop-blur-md space-y-5">
          {/* Parent Task Metadata Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedTaskId('ALL')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mb-1 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                <span>View All Pipelines</span>
              </button>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  TASK #{currentTaskMeta.id}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentTaskMeta.title}
                </h2>
                <span className="text-xs text-slate-400">
                  ({currentTaskMeta.project})
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 pt-0.5">
                <span>Owner: <strong className="text-slate-700 dark:text-slate-300 font-medium">{currentTaskMeta.owner}</strong></span>
                <span>•</span>
                <span>Timeline: <strong className="text-slate-700 dark:text-slate-300 font-medium">{currentTaskMeta.startDate} → {currentTaskMeta.dueDate}</strong></span>
                <span>•</span>
                <span className="text-blue-600 dark:text-cyan-400 font-medium">{currentTaskMeta.currentStageText || 'In Progress'}</span>
              </div>
            </div>

            {/* Quick Task Switcher Pills */}
            {renderTaskSwitcherPills()}
          </div>

          {/* Focused Stepper Nodes */}
          {renderMilestoneStepperRail(currentTaskMeta)}
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 2. COMMAND TOOLBAR: FILTER TABS & SEARCH */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {[
            { id: 'all', label: 'All Steps', count: totalStepsCount },
            { id: 'pending', label: 'Needs Review', count: pendingStepsCount },
            { id: 'changes', label: 'Revisions', count: changesRequestedCount },
            { id: 'approved', label: 'Approved', count: approvedStepsCount },
            { id: 'audit', label: 'Audit Trail', count: auditLogs.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : tab.id === 'pending'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Minimalist Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search step title, deliverable, or submitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100/70 dark:bg-white/[0.04] border border-transparent focus:border-slate-300 dark:focus:border-slate-700 focus:bg-transparent rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP VERIFICATION & APPROVAL MATRIX TABLE */}
      {/* ========================================================================= */}
      {activeTab !== 'audit' && (
        <div className="border border-slate-200/60 dark:border-slate-800/50 rounded-2xl overflow-hidden bg-white/40 dark:bg-[#07080c]/30 backdrop-blur-md">
          {/* Header Row summary */}
          <div className="px-5 py-3.5 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Step Verification Matrix
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {filteredSteps.length} of {totalStepsCount} Steps
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/50 dark:border-slate-800/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-white/[0.01]">
                  <th className="py-3 px-5 w-24">Step</th>
                  <th className="py-3 px-4 min-w-[240px]">Task Objective</th>
                  <th className="py-3 px-4 min-w-[190px]">Deliverable</th>
                  <th className="py-3 px-4 min-w-[170px]">Assigned Engineer</th>
                  <th className="py-3 px-4 w-32 text-center">Progress</th>
                  <th className="py-3 px-4 text-center w-32">Status</th>
                  <th className="py-3 px-5 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                {filteredSteps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-500" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No verification steps found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Steps will appear as tasks progress through their verification stages.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSteps.map((step) => {
                    const isApproved = step.status === 'APPROVED_COMPLETED';
                    const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
                    const isChanges = step.status === 'CHANGES_REQUESTED';
                    const isLocked = step.status === 'LOCKED';
                    const progressPct = isApproved ? 100 : isPending ? 65 : isChanges ? 40 : 0;

                    return (
                      <tr
                        key={step.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors group ${
                          isPending ? 'bg-blue-500/[0.02] dark:bg-blue-500/[0.04]' : ''
                        }`}
                      >
                        {/* 1. Step No. */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-all ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isPending
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-cyan-400 font-extrabold'
                                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400'
                              }`}
                            >
                              {isApproved ? (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : isLocked ? (
                                <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <span>{`0${step.stepNumber}`}</span>
                              )}
                            </div>
                            <span className="font-mono text-xs text-slate-400">
                              {getStepNumberBadge(step)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Task Name & Objective */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {selectedTaskId === 'ALL' && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400 block">
                                Task #{step.taskId} {tasks.find(t => t.id === step.taskId)?.title ? `• ${tasks.find(t => t.id === step.taskId)?.title}` : ''}
                              </span>
                            )}
                            <h4 className="font-semibold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                              {step.objective}
                            </p>
                          </div>
                        </td>

                        {/* 3. Deliverables (Unboxed file link) */}
                        <td className="py-3.5 px-4">
                          {getDeliverableBadge(step)}
                        </td>

                        {/* 4. Assigned Engineer (Unboxed avatar + text) */}
                        <td className="py-3.5 px-4">
                          {step.evidence ? (
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getAvatarByName(step.evidence.submittedBy.name)}
                                alt={step.evidence.submittedBy.name}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                              <div className="min-w-0 text-left">
                                <span className="font-semibold text-slate-900 dark:text-white text-xs block truncate leading-tight">
                                  {step.evidence.submittedBy.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                                  {formatRoleName(step.evidence.submittedBy.role, 'title') || 'Engineer'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                                ?
                              </div>
                              <span className="text-xs italic">Unassigned</span>
                            </div>
                          )}
                        </td>

                        {/* 5. Progress Micro Bar */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-2.5">
                            <div className="w-16 sm:w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isApproved
                                    ? 'bg-emerald-500'
                                    : isPending
                                    ? 'bg-blue-500'
                                    : isChanges
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 w-7 text-right shrink-0">
                              {progressPct}%
                            </span>
                          </div>
                        </td>

                        {/* 6. Status (Glowing Dot + Text, Unboxed) */}
                        <td className="py-3.5 px-4 text-center">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                              <span>Verified</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Needs Review</span>
                            </span>
                          ) : isChanges ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                              <span>Revisions</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span>Locked</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3.5 px-5 text-right">
                          {isPending ? (
                            <button
                              onClick={() => setInspectingStep(step)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.35)] transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Review</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setInspectingStep(step)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                              Details
                            </button>
                          )}
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

      {/* ========================================================================= */}
      {/* 4. AUDIT & ACTIVITY HISTORY STREAM */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl p-6 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl space-y-6 shadow-xs dark:shadow-xl">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Immutable Step Verification Audit History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Chronological cryptographic log of step submissions, Team Leader verification sign-offs, revision notes, and automatic milestone unlocks.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No verification activity recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Verification sign-offs, reviews, and milestone unlocks will appear here.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative space-y-1">
                  <span
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#07080c] ${
                      log.action === 'STEP_APPROVED'
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : log.action === 'WORK_SUBMITTED'
                        ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{log.actorName} ({formatRoleName(log.actorRole, 'title')})</span>
                      <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded uppercase border border-blue-200 dark:border-blue-500/20">
                        {log.action.replace('_', ' ')}
                      </span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{log.details}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STEP INSPECTION & SIGN-OFF MODAL (PORTALED TO DOCUMENT.BODY) */}
      {/* ========================================================================= */}
      {inspectingStep && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain modal-dialog-root">
          <div
            onClick={() => setInspectingStep(null)}
            className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/70 backdrop-blur-sm cursor-pointer"
          />

          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative pointer-events-auto select-text touch-auto w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-[#0e131f] border border-slate-300 dark:border-slate-800 rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-2xl space-y-5 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain ring-1 ring-black/5 dark:ring-white/5"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 font-mono text-[10px] font-bold">
                    STEP {inspectingStep.stepNumber}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Task #{inspectingStep.taskId}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {inspectingStep.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStep(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Objective & Expected Output */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200 dark:border-slate-800/80 space-y-2 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Milestone Objective</span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{inspectingStep.objective}</p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Expected Deliverable:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{inspectingStep.expectedOutput}</span>
              </div>
            </div>

            {/* Submitted Evidence Box */}
            {inspectingStep.evidence ? (
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl text-xs space-y-3 shadow-sm">
                <div className="flex justify-between items-center font-bold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">
                  <span>Submitted Work Evidence</span>
                  <span>By {inspectingStep.evidence.submittedBy.name}</span>
                </div>
                <p className="font-normal text-slate-700 dark:text-slate-200 leading-relaxed">
                  {inspectingStep.evidence.description}
                </p>
                {inspectingStep.evidence.attachments && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inspectingStep.evidence.attachments.map((att: string) => {
                      const isPdf = att.toLowerCase().endsWith('.pdf');
                      const fileUrl = resolveAttachmentUrl(att, inspectingStep);
                      return (
                        <button
                          key={att}
                          type="button"
                          onClick={() => {
                            if (isPdf) {
                              openPdfViewer(
                                fileUrl,
                                att,
                                {
                                  uploadedBy: inspectingStep.evidence?.submittedBy?.name || 'Ram',
                                  isVerified: inspectingStep.status === 'APPROVED_COMPLETED',
                                }
                              );
                            } else {
                              window.open(fileUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ${
                            isPdf
                              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/50'
                              : 'bg-white dark:bg-[#07080c] border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{isPdf ? '📕' : '📄'}</span>
                          <span>{att}</span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                            {isPdf ? 'View PDF' : 'Open File'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Employee has not submitted work evidence proof for this milestone step yet.</span>
              </div>
            )}

            {/* Upload Your Task PDF Deliverable (Drag & Drop + Versioning) */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
              <TaskPdfUploader
                taskId={inspectingStep.taskId}
                stepId={inspectingStep.id}
                stepNumber={inspectingStep.stepNumber}
                stepTitle={inspectingStep.title}
                canUpload={inspectingStep.status !== 'LOCKED'}
                onUploadSuccess={() => {
                  loadData();
                }}
              />
            </div>

            {/* Team Leader Verification Actions */}
            {isTeamLeader && (inspectingStep.status === 'PENDING_APPROVAL' || inspectingStep.status === 'SUBMITTED_FOR_REVIEW') && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Team Leader Review Feedback / Sign-off Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter review remarks, approval sign-off note, or requested modifications..."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#07080c]/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleVerifyAction('REJECT')}
                    className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors text-center"
                  >
                    ✖ Reject Step
                  </button>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleVerifyAction('REQUEST_CHANGES')}
                      className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors text-center"
                    >
                      ↺ Request Revisions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyAction('APPROVE')}
                      style={{
                        backgroundColor: '#2563eb',
                        boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)'
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 sm:py-2 hover:brightness-110 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Approve & Unlock Next Step</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Global Responsive Premium PDF Viewer Modal */}
      <PremiumPdfViewerModal
        isOpen={pdfViewerState.isOpen}
        onClose={() => setPdfViewerState((prev) => ({ ...prev, isOpen: false }))}
        pdfUrl={pdfViewerState.pdfUrl}
        fileName={pdfViewerState.fileName}
        fileSize={pdfViewerState.fileSize}
        version={pdfViewerState.version}
        uploadedBy={pdfViewerState.uploadedBy}
        uploadedAt={pdfViewerState.uploadedAt}
        isVerified={pdfViewerState.isVerified}
      />

    </div>
  );
}
