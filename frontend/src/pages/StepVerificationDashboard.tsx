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

interface ParentTaskMeta {
  id: number;
  title: string;
  project: string;
  owner: string;
  startDate: string;
  dueDate: string;
  milestones: { step: string; name: string; status: 'APPROVED' | 'ACTIVE' | 'LOCKED' }[];
}

const PARENT_TASKS: Record<number, ParentTaskMeta> = {
  201: {
    id: 201,
    title: 'Q3 Platform Architecture & Launch',
    project: 'Prologue SaaS (Task ID: #201)',
    owner: 'Niranjan (Admin)',
    startDate: '2026-08-20',
    dueDate: '2026-09-05',
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
    owner: 'Vinay (Team Lead)',
    startDate: '2026-08-22',
    dueDate: '2026-09-08',
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

  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  // Active Selected Parent Task for the Stepper Ribbon (or 'ALL')
  const [selectedTaskId, setSelectedTaskId] = useState<number | 'ALL'>(201);

  // Sample tasks list to render verification requests
  const sampleTaskIds = [201, 102];
  const [allTaskSteps, setAllTaskSteps] = useState<TaskStep[]>([]);
  const [auditLogs, setAuditLogs] = useState<StepAuditLog[]>([]);
  const [notifications, setNotifications] = useState<StepNotification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Step for Inspection Modal
  const [inspectingStep, setInspectingStep] = useState<TaskStep | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Freeze background completely when step inspection modal is open
  useScrollLock(!!inspectingStep);

  const loadData = () => {
    let combinedSteps: TaskStep[] = [];
    sampleTaskIds.forEach((id) => {
      combinedSteps = [...combinedSteps, ...getTaskSteps(id)];
    });

    // Role-based scoping: Employees see only their assigned steps; TL sees all steps
    if (!isTeamLeader) {
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
  }, []);

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

      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 border border-slate-700/80 text-slate-200">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
            isPdf ? 'bg-rose-500/20 text-rose-400' :
            isFig ? 'bg-purple-500/20 text-purple-400' :
            isDoc ? 'bg-blue-500/20 text-blue-400' :
            isZip ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
          }`}>
            {isPdf ? 'PDF' : isFig ? 'Figma' : isDoc ? 'DOCX' : isZip ? 'ZIP' : 'FILE'}
          </span>
          <span className="truncate max-w-[130px] font-medium text-slate-300" title={att}>{att}</span>
        </span>
      );
    }

    if (step.status === 'APPROVED_COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300">DOCS</span>
          <span className="truncate max-w-[130px] font-medium">Verified Blueprint</span>
        </span>
      );
    }

    if (step.status === 'PENDING_APPROVAL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-300">CODE</span>
          <span className="truncate max-w-[130px] font-medium">PR #42 & Specs</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 bg-slate-900/50 border border-slate-800">
        <Lock className="w-3 h-3 text-slate-600" />
        <span className="italic">Pending Submission</span>
      </span>
    );
  };

  const getStepNumberBadge = (step: TaskStep) => {
    const taskPrefix = step.taskId === 201 ? '2' : '1';
    return `[${taskPrefix}.${step.stepNumber}]`;
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      
      {/* ========================================================================= */}
      {/* TOP COMMAND HEADER WITH TELEMETRY (OPTION 2 OBSIDIAN EXECUTIVE STYLE) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 font-heading">
            <div className="w-9 h-9 rounded-2xl bg-[#0e131f] border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            TASK STEP VERIFICATION AND APPROVAL
          </h1>
          <p className="text-xs font-normal text-slate-400 mt-1 pl-12">
            Sequential milestone gating: Employees submit work proof; Team Leaders inspect & sign-off; unlocks next step automatically.
          </p>
        </div>

        {/* Option 2 Telemetry Capsule (Digital Clock & Active Pipeline) */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0e131f] border border-slate-800/80 text-xs font-mono text-slate-300 flex items-center gap-2 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>03:25 PM • Active</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-[#0e131f] border border-slate-800/80 text-xs font-semibold text-slate-300 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>Pipeline Enforced</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP PARENT TASK & SEQUENTIAL MILESTONE STEPPER RIBBON (EXACT OPTION 2) */}
      {/* ========================================================================= */}
      <div className="bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
        {/* Parent Task Metadata Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentTaskMeta.title}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {currentTaskMeta.project}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3 pt-0.5">
              <span>Owner: <strong className="text-slate-200">{currentTaskMeta.owner}</strong></span>
              <span>•</span>
              <span>Start Date: <strong className="text-slate-200">{currentTaskMeta.startDate}</strong></span>
              <span>•</span>
              <span>Due Date: <strong className="text-slate-200">{currentTaskMeta.dueDate}</strong></span>
            </div>
          </div>

          {/* Quick Task Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-[#07080c]/80 p-1 rounded-xl border border-slate-800/80 self-start md:self-auto shrink-0">
            <button
              onClick={() => setSelectedTaskId(201)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTaskId === 201
                  ? 'bg-[#1c2438] text-white border border-white/10 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Task #201
            </button>
            <button
              onClick={() => setSelectedTaskId(102)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTaskId === 102
                  ? 'bg-[#1c2438] text-white border border-white/10 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Task #102
            </button>
            <button
              onClick={() => setSelectedTaskId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTaskId === 'ALL'
                  ? 'bg-[#1c2438] text-white border border-white/10 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Pipelines
            </button>
          </div>
        </div>

        {/* Sequential Stepper Nodes with Illuminated Connecting Lines */}
        <div className="pt-2 pb-2">
          <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto px-4">
            
            {/* Background connecting rail */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-slate-800/80 z-0">
              {/* Active progressive glowing blue/cyan bar */}
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                style={{ width: selectedTaskId === 201 ? '45%' : selectedTaskId === 102 ? '45%' : '60%' }}
              />
            </div>

            {/* Stepper Nodes */}
            {currentTaskMeta.milestones.map((m, idx) => {
              const isApproved = m.status === 'APPROVED';
              const isActive = m.status === 'ACTIVE';
              const isLocked = m.status === 'LOCKED';

              return (
                <div key={m.step} className="relative z-10 flex flex-col items-center group">
                  {/* Circle Node */}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isApproved
                        ? 'bg-[#0e131f] border-2 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : isActive
                        ? 'bg-[#0e131f] border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.6)] scale-110'
                        : 'bg-[#0e131f] border-2 border-slate-700 text-slate-400 opacity-60'
                    }`}
                  >
                    {isApproved ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : isLocked ? (
                      <Lock className="w-4 h-4 text-slate-500" />
                    ) : (
                      <span className="font-mono text-xs font-black">{m.step}</span>
                    )}
                  </div>

                  {/* Node Label Below */}
                  <div className="mt-2.5 text-center">
                    <span className={`block text-xs font-bold tracking-tight whitespace-nowrap ${
                      isActive ? 'text-white' : isApproved ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {m.name}
                    </span>
                    <span className={`block text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                      isApproved ? 'text-emerald-400' : isActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'
                    }`}>
                      {isApproved ? 'Verified ✓' : isActive ? 'In Progress' : 'Locked'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COMMAND TOOLBAR: SEGMENTED FILTER PILLS & SEARCH (OPTION 2 STANDARD) */}
      {/* ========================================================================= */}
      <div className="bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-2.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#07080c]/80 p-1.5 rounded-xl border border-slate-800/80 overflow-x-auto">
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
                    ? 'bg-[#1c2438] text-white border border-white/10 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                      isActive
                        ? 'bg-blue-500/30 text-blue-300'
                        : tab.id === 'pending'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-800 text-slate-400'
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
            className="w-full pl-10 pr-4 py-2 bg-[#07080c]/80 border border-slate-800/80 rounded-xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STEP VERIFICATION & APPROVAL MATRIX TABLE (EXACT OPTION 2 DESIGN) */}
      {/* ========================================================================= */}
      {activeTab !== 'audit' && (
        <div className="bg-[#0e131f]/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
          {/* Card Table Subheader */}
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                Step Verification and Approval
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                {filteredSteps.length} of {totalStepsCount} Steps Filtered
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-24">Step No.</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Task Name & Objective</th>
                  <th className="py-3.5 px-4 min-w-[170px]">Deliverable</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Assigned To</th>
                  <th className="py-3.5 px-4 w-28 text-center">Progress</th>
                  <th className="py-3.5 px-4 text-center w-36">Status</th>
                  <th className="py-3.5 px-5 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {filteredSteps.map((step) => {
                  const isApproved = step.status === 'APPROVED_COMPLETED';
                  const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
                  const isChanges = step.status === 'CHANGES_REQUESTED';
                  const isLocked = step.status === 'LOCKED';

                  // Dynamic Progress %
                  const progressPct = isApproved ? 100 : isPending ? 65 : isChanges ? 40 : 0;

                  return (
                    <tr
                      key={step.id}
                      className={`hover:bg-white/[0.02] transition-colors group ${
                        isPending ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* 1. Step No. Badge */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <FileCode className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
                          <span className="font-mono text-xs font-bold text-slate-300">
                            {getStepNumberBadge(step)}
                          </span>
                        </div>
                      </td>

                      {/* 2. Task Name & Objective */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-white text-xs group-hover:text-blue-400 transition-colors">
                            {step.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1 leading-snug">
                            {step.objective}
                          </p>
                        </div>
                      </td>

                      {/* 3. Deliverable Output */}
                      <td className="py-4 px-4">
                        {getDeliverableBadge(step)}
                      </td>

                      {/* 4. Assigned To */}
                      <td className="py-4 px-4">
                        {step.evidence ? (
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getAvatarByName(step.evidence.submittedBy.name)}
                              alt={step.evidence.submittedBy.name}
                              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-700"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-white text-xs block truncate">
                                {step.evidence.submittedBy.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                Engineer
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              ?
                            </div>
                            <span className="text-xs italic text-slate-400">Unassigned</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Progress Micro Bar */}
                      <td className="py-4 px-4 text-center">
                        <div className="w-full max-w-[80px] mx-auto space-y-1">
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isApproved
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                  : isPending
                                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                                  : isChanges
                                  ? 'bg-amber-400'
                                  : 'bg-slate-700'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            {progressPct}%
                          </span>
                        </div>
                      </td>

                      {/* 6. Glowing Status Badge */}
                      <td className="py-4 px-4 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                            ✓ VERIFIED
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)] animate-pulse">
                            NEEDS REVIEW
                          </span>
                        ) : isChanges ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                            REVISION ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Lock className="w-3 h-3" />
                            LOCKED STEP
                          </span>
                        )}
                      </td>

                      {/* 7. Action Button (Electric Royal Blue for Pending) */}
                      <td className="py-4 px-5 text-right">
                        {isPending ? (
                          <button
                            onClick={() => setInspectingStep(step)}
                            style={{
                              backgroundColor: '#2563eb',
                              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)'
                            }}
                            className="px-4 py-1.5 hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
                          >
                            <span>Review</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setInspectingStep(step)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-semibold cursor-pointer transition-all"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AUDIT & ACTIVITY HISTORY STREAM (WHEN AUDIT TAB IS SELECTED) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-[#0e131f]/90 backdrop-blur-xl p-6 border border-slate-800/80 rounded-2xl space-y-6 shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" /> Immutable Step Verification Audit History
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Chronological cryptographic log of step submissions, Team Leader verification sign-offs, revision notes, and automatic milestone unlocks.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-slate-800">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative space-y-1">
                <span
                  className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-[#07080c] ${
                    log.action === 'STEP_APPROVED'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : log.action === 'WORK_SUBMITTED'
                      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      : 'bg-blue-500'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{log.actorName} ({formatRoleName(log.actorRole, 'title')})</span>
                    <span className="text-[9px] font-mono font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded uppercase border border-blue-500/20">
                      {log.action.replace('_', ' ')}
                    </span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STEP INSPECTION & SIGN-OFF MODAL (PORTALED TO DOCUMENT.BODY) */}
      {/* ========================================================================= */}
      {inspectingStep && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain modal-dialog-root">
          <div
            onClick={() => setInspectingStep(null)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
          />

          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative pointer-events-auto select-text touch-auto w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 bg-[#0e131f] border border-slate-800 rounded-3xl shadow-2xl space-y-5 text-white modal-dialog-contain overscroll-contain"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                    STEP {inspectingStep.stepNumber}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Task #{inspectingStep.taskId}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {inspectingStep.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingStep(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Objective & Expected Output */}
            <div className="p-4 rounded-xl bg-[#07080c]/60 border border-slate-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Milestone Objective</span>
              <p className="text-xs text-slate-300 leading-relaxed">{inspectingStep.objective}</p>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Expected Deliverable:</span>
                <span className="font-semibold text-blue-400">{inspectingStep.expectedOutput}</span>
              </div>
            </div>

            {/* Submitted Evidence Box */}
            {inspectingStep.evidence ? (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl text-xs space-y-3">
                <div className="flex justify-between items-center font-bold text-[10px] text-emerald-400 uppercase">
                  <span>Submitted Work Evidence</span>
                  <span>By {inspectingStep.evidence.submittedBy.name}</span>
                </div>
                <p className="font-normal text-slate-200 leading-relaxed">
                  {inspectingStep.evidence.description}
                </p>
                {inspectingStep.evidence.attachments && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inspectingStep.evidence.attachments.map((att: string) => (
                      <span
                        key={att}
                        className="px-2.5 py-1 rounded-lg bg-[#07080c] border border-emerald-500/30 text-emerald-300 text-[11px] font-mono"
                      >
                        📄 {att}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Employee has not submitted work evidence proof for this milestone step yet.</span>
              </div>
            )}

            {/* Team Leader Verification Actions */}
            {isTeamLeader && (inspectingStep.status === 'PENDING_APPROVAL' || inspectingStep.status === 'SUBMITTED_FOR_REVIEW') && (
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Team Leader Review Feedback / Sign-off Notes
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter review remarks, approval sign-off note, or requested modifications..."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#07080c]/80 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleVerifyAction('REJECT')}
                    className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    ✖ Reject Step
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleVerifyAction('REQUEST_CHANGES')}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      ↺ Request Revisions
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyAction('APPROVE')}
                      style={{
                        backgroundColor: '#2563eb',
                        boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.4)'
                      }}
                      className="px-5 py-2 hover:brightness-110 text-white rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
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

    </div>
  );
}
