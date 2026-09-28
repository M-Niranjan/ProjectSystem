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

const PARENT_TASKS: Record<number, ParentTaskMeta> = {
  201: {
    id: 201,
    title: 'Q3 Platform Architecture & Launch',
    project: 'Prologue SaaS (Task ID: #201)',
    shortProject: 'Prologue SaaS',
    owner: 'Niranjan (Admin)',
    startDate: '2026-08-20',
    dueDate: '2026-09-05',
    currentStageText: 'Stage 2 of 4: Component Integration',
    milestones: [
      { step: '01', name: 'Planning & Specs', status: 'APPROVED' },
      { step: '02', name: 'Component Integration', status: 'ACTIVE' },
      { step: '03', name: 'Asset & QA Review', status: 'LOCKED' },
      { step: '04', name: 'Final Launch', status: 'LOCKED' },
    ]
  },
  102: {
    id: 102,
    title: 'Mobile Viewport & Auth Session Sync',
    project: 'Core Platform (Task ID: #102)',
    shortProject: 'Core Platform',
    owner: 'Vinay (Team Lead)',
    startDate: '2026-08-22',
    dueDate: '2026-09-08',
    currentStageText: 'Stage 2 of 4: Auth Middleware',
    milestones: [
      { step: '01', name: 'UI Wireframes', status: 'APPROVED' },
      { step: '02', name: 'Auth Middleware', status: 'ACTIVE' },
      { step: '03', name: 'Smoke Testing', status: 'LOCKED' },
      { step: '04', name: 'Staging Release', status: 'LOCKED' },
    ]
  }
};

export default function StepVerificationDashboard() {
  const { user } = useAuthStore();
  const { showToast } = useUIStore();
  const { activeTab, setActiveTab } = useStepVerificationStore();

  const isTeamLeader = !user || user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  // Active Selected Parent Task for the Stepper Ribbon (or 'ALL')
  const [selectedTaskId, setSelectedTaskId] = useState<number | 'ALL'>(201);

  // View Mode: 'table' (Luxury Balanced Table Grid) or 'bento' (Modular Bento Cards)
  const [viewMode, setViewMode] = useState<'table' | 'bento'>('table');

  // Sample tasks list to render verification requests
  const sampleTaskIds = [201, 102];
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
      uploadedBy: opts?.uploadedBy || 'Ram',
      uploadedAt: opts?.uploadedAt || new Date().toISOString(),
      isVerified: opts?.isVerified ?? true,
    });
  };

  // Freeze background completely when step inspection modal is open
  useScrollLock(!!inspectingStep || pdfViewerState.isOpen);

  const loadData = () => {
    let combinedSteps: TaskStep[] = [];
    sampleTaskIds.forEach((id) => {
      combinedSteps = [...combinedSteps, ...getTaskSteps(id)];
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

  const currentTaskMeta = selectedTaskId !== 'ALL' ? PARENT_TASKS[selectedTaskId] : PARENT_TASKS[201];

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

  const getDeliverableBadge = (step: TaskStep) => {
    if (step.evidence?.attachments && step.evidence.attachments.length > 0) {
      const att = step.evidence.attachments[0];
      const isPdf = att.endsWith('.pdf');
      const isFig = att.endsWith('.fig');
      const isDoc = att.endsWith('.docx');
      const isZip = att.endsWith('.zip');
      const fileSize = isPdf ? '2.4 MB' : isZip ? '12.1 MB' : isFig ? '45 MB' : isDoc ? '1.8 MB' : '3.2 MB';

      return (
        <span 
          onClick={(e) => {
            if (isPdf) {
              e.stopPropagation();
              openPdfViewer(
                att === 'Architecture_v1.2.pdf' ? '/Architecture_v1.2.pdf' : `/uploads/${att}`,
                att,
                {
                  uploadedBy: step.evidence?.submittedBy?.name || 'Ram',
                  isVerified: step.status === 'APPROVED_COMPLETED',
                }
              );
            }
          }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200/90 dark:bg-[#07080c]/60 dark:border-slate-800/90 text-slate-700 dark:text-slate-200 transition-all ${
            isPdf ? 'cursor-pointer hover:border-red-500/50 hover:bg-red-50/50 dark:hover:bg-red-500/10' : ''
          }`}
          title={isPdf ? `Click to view ${att}` : att}
        >
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
            isPdf ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400' :
            isFig ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-400' :
            isDoc ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400' :
            isZip ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
          }`}>
            {isPdf ? 'PDF' : isFig ? 'FIG' : isDoc ? 'DOCX' : isZip ? 'ZIP' : 'FILE'}
          </span>
          <div className="flex flex-col min-w-0 text-left">
            <span className="truncate max-w-[150px] font-bold text-slate-800 dark:text-slate-200 text-xs leading-tight">{att}</span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight">{fileSize}</span>
          </div>
        </span>
      );
    }

    if (step.status === 'APPROVED_COMPLETED') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">DOCS</span>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs leading-tight">Verified Blueprint</span>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono leading-tight">Signed-off</span>
          </div>
        </span>
      );
    }

    if (step.status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/90 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">CODE</span>
          <div className="flex flex-col text-left">
            <span className="font-bold text-xs leading-tight">PR #42 & Specs</span>
            <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 font-mono leading-tight">Review Ready</span>
          </div>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200/80 dark:bg-[#07080c]/40 dark:border-slate-800/80">
        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="italic text-[11px]">Pending Submission</span>
      </span>
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
      <div className="pt-2 pb-2 overflow-x-auto custom-scrollbar">
        <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto px-4 min-w-[520px] sm:min-w-0">
          {/* Background connecting rail */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800/80 z-0">
            {/* Active progressive glowing bar */}
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 transition-all duration-500 shadow-sm"
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
                {/* Circle Node */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isApproved
                      ? 'bg-white dark:bg-[#0e131f] border-2 border-emerald-500 text-emerald-600 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : isActive
                      ? 'bg-white dark:bg-[#0e131f] border-2 border-blue-600 dark:border-cyan-400 text-blue-600 dark:text-cyan-300 shadow-[0_0_20px_rgba(37,99,235,0.25)] scale-110'
                      : 'bg-slate-100 dark:bg-[#0e131f] border-2 border-slate-300 dark:border-slate-700 text-slate-400 opacity-70'
                  }`}
                >
                  {isApproved ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <span className="font-mono text-xs font-black">{m.step}</span>
                  )}
                </div>

                {/* Node Label Below */}
                <div className="mt-2.5 text-center max-w-[125px]">
                  <span
                    className={`block text-xs font-bold tracking-tight truncate ${
                      isActive ? 'text-slate-900 dark:text-white font-extrabold' : isApproved ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
                    }`}
                  >
                    {m.name}
                  </span>
                  <span
                    className={`block text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                      isApproved ? 'text-emerald-600 dark:text-emerald-400' : isActive ? 'text-blue-600 dark:text-cyan-400 animate-pulse' : 'text-slate-400'
                    }`}
                  >
                    {isApproved ? 'Verified ✓' : isActive ? 'In Progress' : 'Locked'}
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
    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#07080c]/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80 self-start md:self-auto shrink-0">
      <button
        onClick={() => setSelectedTaskId(201)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          selectedTaskId === 201
            ? 'bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        Task #201
      </button>
      <button
        onClick={() => setSelectedTaskId(102)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
          selectedTaskId === 102
            ? 'bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        Task #102
      </button>
      <button
        onClick={() => setSelectedTaskId('ALL')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
          selectedTaskId === 'ALL'
            ? 'bg-white dark:bg-[#1c2438] text-blue-600 dark:text-blue-400 border border-slate-200/80 dark:border-white/10 shadow-xs font-extrabold'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Pipelines</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      
      {/* ========================================================================= */}
      {/* TOP COMMAND HEADER WITH TELEMETRY (CONCEPT 2 EXECUTIVE LUMINOUS) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-3 font-heading">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200/80 text-blue-600 dark:bg-[#0e131f] dark:border-blue-500/40 dark:text-blue-400 flex items-center justify-center shadow-xs dark:shadow-lg dark:shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            TASK STEP VERIFICATION AND APPROVAL
          </h1>
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1 pl-12">
            Sequential milestone gating: Employees submit work proof; Team Leaders inspect & sign-off; unlocks next step automatically.
          </p>
        </div>

        {/* Telemetry Capsule (Digital Clock & Active Pipeline) */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0e131f] border border-slate-200/90 dark:border-slate-800/80 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>03:25 PM • Active</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#0e131f] border border-slate-200/90 dark:border-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Pipeline Enforced</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP PARENT TASK & SEQUENTIAL MILESTONE STEPPER RIBBON */}
      {/* ========================================================================= */}
      {selectedTaskId === 'ALL' ? (
        <div className="space-y-4">
          {/* Enterprise Hub Header & Telemetry Summary */}
          <div className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                        All Active Pipelines Overview
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        2 Active Tracks
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Multi-track sequential verification. Each milestone requires Team Leader sign-off before unlocking subsequent stages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Task Switcher Pills */}
              {renderTaskSwitcherPills()}
            </div>

            {/* Enterprise Aggregate KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200/70 dark:border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Active Pipelines</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">2 Projects</span>
                <span className="text-[10px] text-slate-500">Prologue & Core Track</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200/70 dark:border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Milestones</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">8 Gated Stages</span>
                <span className="text-[10px] text-slate-500">4 stages per pipeline</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200/70 dark:border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Verified Stages</span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 block">2 Completed</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">25% Enterprise Progress</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200/70 dark:border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block">Pending Review</span>
                <span className="text-base font-extrabold text-amber-700 dark:text-amber-300 mt-0.5 block">1 Deliverable</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400">PR #42 Awaiting Sign-off</span>
              </div>
            </div>
          </div>

          {/* Multi-Pipeline Cards: Render Both Task 201 & Task 102 */}
          <div className="space-y-4">
            {Object.values(PARENT_TASKS).map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xs dark:shadow-xl relative overflow-hidden transition-all duration-300 hover:border-blue-400/50 dark:hover:border-blue-500/30 group"
              >
                {/* Card Top Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                        task.id === 201
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                          : 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
                      }`}>
                        TASK #{task.id}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {task.title}
                      </h3>
                      <span className="text-xs text-slate-400">
                        ({task.shortProject || task.project})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2.5 pt-0.5">
                      <span>Owner: <strong className="text-slate-800 dark:text-slate-200">{task.owner}</strong></span>
                      <span>•</span>
                      <span>Timeline: <strong className="text-slate-800 dark:text-slate-200">{task.startDate} → {task.dueDate}</strong></span>
                      <span>•</span>
                      <span className="text-blue-600 dark:text-cyan-400 font-semibold">{task.currentStageText || 'Stage 2 In Progress'}</span>
                    </div>
                  </div>

                  {/* Quick Action: Focus Pipeline */}
                  <button
                    onClick={() => setSelectedTaskId(task.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800/80 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    <span>Focus Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* Stepper Ribbon for this task */}
                <div className="pt-2">
                  {renderMilestoneStepperRail(task)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Single Focused Pipeline View (Task #201 or Task #102) */
        <div className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xs dark:shadow-xl relative overflow-hidden space-y-6">
          {/* Parent Task Metadata Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div className="space-y-1">
              <button
                onClick={() => setSelectedTaskId('ALL')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mb-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>View All Pipelines</span>
              </button>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                  currentTaskMeta.id === 201
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    : 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
                }`}>
                  TASK #{currentTaskMeta.id}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentTaskMeta.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                  {currentTaskMeta.project}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 pt-0.5">
                <span>Owner: <strong className="text-slate-800 dark:text-slate-200">{currentTaskMeta.owner}</strong></span>
                <span>•</span>
                <span>Start Date: <strong className="text-slate-800 dark:text-slate-200">{currentTaskMeta.startDate}</strong></span>
                <span>•</span>
                <span>Due Date: <strong className="text-slate-800 dark:text-slate-200">{currentTaskMeta.dueDate}</strong></span>
              </div>
            </div>

            {/* Quick Task Switcher Pills */}
            {renderTaskSwitcherPills()}
          </div>

          {/* Focused Stepper Nodes */}
          {renderMilestoneStepperRail(currentTaskMeta)}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMMAND TOOLBAR: SEGMENTED FILTER PILLS & SEARCH */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs dark:shadow-lg">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#07080c]/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 overflow-x-auto custom-scrollbar">
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
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/30 dark:text-blue-300'
                        : tab.id === 'pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Inset Search Field */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search step title, deliverable, or submitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#07080c]/80 border border-slate-200/90 dark:border-slate-800/80 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP VERIFICATION & APPROVAL MATRIX TABLE / BENTO VIEW */}
      {/* ========================================================================= */}
      {activeTab !== 'audit' && (
        <div className="bg-white dark:bg-[#0e131f]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs dark:shadow-2xl">
          {/* Card Table Subheader */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight uppercase">
                Step Verification and Approval
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {filteredSteps.length} of {totalStepsCount} Steps Filtered
              </span>

              {/* View Switcher: Table vs Bento Grid */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#07080c]/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Luxury Balanced Table View"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
                <button
                  onClick={() => setViewMode('bento')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'bento'
                      ? 'bg-white dark:bg-[#1c2438] text-slate-900 dark:text-white border border-slate-200/80 dark:border-white/10 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                  title="Bento Cards Grid View"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bento Cards</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: LUXURY BALANCED TABLE GRID (CONCEPT 5) */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/90 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/50 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5 w-28">Step No.</th>
                    <th className="py-3.5 px-4 min-w-[240px]">Task Name & Objective</th>
                    <th className="py-3.5 px-4 min-w-[190px]">Deliverables</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Assigned Engineer</th>
                    <th className="py-3.5 px-4 w-36 text-center">Progress</th>
                    <th className="py-3.5 px-4 text-center w-36">Status</th>
                    <th className="py-3.5 px-5 text-right w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {filteredSteps.map((step) => {
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
                        {/* 1. Step No. Anchor Badge */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-extrabold shrink-0 border transition-all ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                                  : isPending
                                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/40 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.35)] scale-105'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700/80'
                              }`}
                            >
                              {isApproved ? (
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              ) : isLocked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <span>{`0${step.stepNumber}`}</span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                              {getStepNumberBadge(step)}
                            </span>
                          </div>
                        </td>

                        {/* 2. Task Name & Objective */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {selectedTaskId === 'ALL' && (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold uppercase tracking-wide ${
                                    step.taskId === 201
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                      : 'bg-teal-50 text-teal-700 border border-teal-200/80 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20'
                                  }`}
                                >
                                  {step.taskId === 201 ? 'Task #201 • Prologue SaaS' : 'Task #102 • Core Platform'}
                                </span>
                              </div>
                            )}
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {step.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-snug">
                              {step.objective}
                            </p>
                          </div>
                        </td>

                        {/* 3. Deliverable Output with File Size */}
                        <td className="py-4 px-4">
                          {getDeliverableBadge(step)}
                        </td>

                        {/* 4. Assigned Engineer Capsule */}
                        <td className="py-4 px-4">
                          {step.evidence ? (
                            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#07080c]/60 border border-slate-200/80 dark:border-slate-800/80">
                              <img
                                src={getAvatarByName(step.evidence.submittedBy.name)}
                                alt={step.evidence.submittedBy.name}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                              <div className="min-w-0 text-left">
                                <span className="font-bold text-slate-900 dark:text-white text-xs block truncate leading-tight">
                                  {step.evidence.submittedBy.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium block leading-tight">
                                  {step.evidence.submittedBy.name === 'Ram'
                                    ? 'Lead Architect'
                                    : step.evidence.submittedBy.name === 'Mallu'
                                    ? 'Senior Engineer'
                                    : 'Engineer'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#07080c]/40 border border-slate-200/60 dark:border-slate-800/60 text-slate-400">
                              <div className="w-7 h-7 rounded-full bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                ?
                              </div>
                              <div className="min-w-0 text-left">
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block leading-tight">Unassigned</span>
                                <span className="text-[10px] text-slate-400 block leading-tight">Pending Stage</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* 5. Progress Micro Bar with Inline Percentage */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center justify-center gap-2.5">
                            <div className="w-20 sm:w-24 h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isApproved
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                    : isPending
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                    : isChanges
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-8 text-right shrink-0">
                              {progressPct}%
                            </span>
                          </div>
                        </td>

                        {/* 6. Status Badge */}
                        <td className="py-4 px-4 text-center">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>VERIFIED</span>
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>NEEDS REVIEW</span>
                            </span>
                          ) : isChanges ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>REVISION ACTIVE</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>LOCKED STEP</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-4 px-5 text-right">
                          {isPending ? (
                            <button
                              onClick={() => setInspectingStep(step)}
                              style={{
                                backgroundColor: '#2563eb',
                                boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.35)'
                              }}
                              className="px-4 py-1.5 hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5 shadow"
                            >
                              <span>Review Step</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setInspectingStep(step)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold cursor-pointer transition-all"
                            >
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VIEW MODE 2: MODULAR BENTO CARDS GRID (CONCEPT 3) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {filteredSteps.map((step) => {
                const isApproved = step.status === 'APPROVED_COMPLETED';
                const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
                const isChanges = step.status === 'CHANGES_REQUESTED';
                const isLocked = step.status === 'LOCKED';
                const progressPct = isApproved ? 100 : isPending ? 65 : isChanges ? 40 : 0;

                return (
                  <div
                    key={step.id}
                    className={`bg-slate-50/80 dark:bg-[#07080c]/60 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-blue-500/50 group ${
                      isPending
                        ? 'border-blue-500/40 dark:border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20'
                        : 'border-slate-200/90 dark:border-slate-800/80 shadow-xs'
                    }`}
                  >
                    {/* Bento Top Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                              isApproved
                                ? 'bg-emerald-500 text-white'
                                : isPending
                                ? 'bg-blue-600 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {isApproved ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : isLocked ? <Lock className="w-3 h-3" /> : step.stepNumber}
                          </div>
                          <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {getStepNumberBadge(step)}
                          </span>
                        </div>

                        {/* Status Chip */}
                        {isApproved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                            ✓ VERIFIED
                          </span>
                        ) : isPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30 animate-pulse">
                            NEEDS REVIEW
                          </span>
                        ) : isChanges ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30">
                            REVISION
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            LOCKED
                          </span>
                        )}
                      </div>

                      {/* Step Title & Objective */}
                      <div className="space-y-1">
                        {selectedTaskId === 'ALL' && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-cyan-400 block uppercase">
                            {step.taskId === 201 ? 'Task #201 • Prologue' : 'Task #102 • Core'}
                          </span>
                        )}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {step.objective}
                        </p>
                      </div>

                      {/* Deliverable Capsule */}
                      <div className="pt-1">
                        {getDeliverableBadge(step)}
                      </div>
                    </div>

                    {/* Bento Bottom Footer */}
                    <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3 mt-4">
                      {/* Assignee & Progress */}
                      <div className="flex items-center justify-between gap-3">
                        {step.evidence ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getAvatarByName(step.evidence.submittedBy.name)}
                              alt={step.evidence.submittedBy.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {step.evidence.submittedBy.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}

                        <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                          {progressPct}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isApproved
                              ? 'bg-emerald-500'
                              : isPending
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600'
                              : 'bg-slate-400 dark:bg-slate-600'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Action Button */}
                      <div className="pt-1">
                        {isPending ? (
                          <button
                            onClick={() => setInspectingStep(step)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(37,99,235,0.4)] cursor-pointer"
                          >
                            <span>Review & Verify Step</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setInspectingStep(step)}
                            className="w-full py-2 bg-white dark:bg-[#1c2438] hover:bg-slate-100 dark:hover:bg-[#25314d] text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                      return (
                        <button
                          key={att}
                          type="button"
                          onClick={() => {
                            if (isPdf) {
                              openPdfViewer(
                                att === 'Architecture_v1.2.pdf' ? '/Architecture_v1.2.pdf' : `/uploads/${att}`,
                                att,
                                {
                                  uploadedBy: inspectingStep.evidence?.submittedBy?.name || 'Ram',
                                  isVerified: inspectingStep.status === 'APPROVED_COMPLETED',
                                }
                              );
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono shadow-sm transition-all flex items-center gap-1.5 ${
                            isPdf
                              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:border-red-300 dark:hover:border-red-500/50 cursor-pointer'
                              : 'bg-white dark:bg-[#07080c] border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          <span>{isPdf ? '📕' : '📄'}</span>
                          <span>{att}</span>
                          {isPdf && (
                            <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-500/20 text-[9px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
                              View PDF
                            </span>
                          )}
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

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleVerifyAction('REJECT')}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    ✖ Reject Step
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleVerifyAction('REQUEST_CHANGES')}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors"
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
                      className="px-5 py-2 hover:brightness-110 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow"
                    >
                      <Check className="w-4 h-4" />
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
