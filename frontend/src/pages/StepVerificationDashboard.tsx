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
  X
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
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

export default function StepVerificationDashboard() {
  const { user } = useAuthStore();
  const { activeTab, setActiveTab } = useStepVerificationStore();

  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

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

  // Toast State
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 4000);
  };

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
    if (activeTab === 'pending' && s.status !== 'PENDING_APPROVAL' && s.status !== 'SUBMITTED_FOR_REVIEW') return false;
    if (activeTab === 'changes' && s.status !== 'CHANGES_REQUESTED') return false;
    if (activeTab === 'approved' && s.status !== 'APPROVED_COMPLETED') return false;
    if (searchQuery && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate Metrics
  const totalStepsCount = allTaskSteps.length;
  const approvedStepsCount = allTaskSteps.filter((s) => s.status === 'APPROVED_COMPLETED').length;
  const pendingStepsCount = allTaskSteps.filter((s) => s.status === 'PENDING_APPROVAL' || s.status === 'SUBMITTED_FOR_REVIEW').length;
  const changesRequestedCount = allTaskSteps.filter((s) => s.status === 'CHANGES_REQUESTED').length;

  const verifiedProgress = totalStepsCount > 0 ? Math.round((approvedStepsCount / totalStepsCount) * 100) : 100;
  const selfReportedProgress =
    totalStepsCount > 0 ? Math.round(((approvedStepsCount + pendingStepsCount) / totalStepsCount) * 100) : 100;

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

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title & Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full min-w-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              Task Step Verification & Approval Control
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Core Rule: Employees submit work evidence; Team Leaders verify; only verified steps count toward official progress.
          </p>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-emerald-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Verified Progress</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{verifiedProgress}%</p>
          <span className="text-[10px] font-bold text-emerald-500">Official Progress</span>
        </div>

        <div className="glass-panel p-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Verification</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingStepsCount}</p>
          <span className="text-[10px] font-bold text-amber-500">Awaiting Sign-off</span>
        </div>

        <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Changes Requested</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{changesRequestedCount}</p>
          <span className="text-[10px] font-bold text-amber-500">Revision Required</span>
        </div>

        <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Self-Reported Gap</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">+{selfReportedProgress - verifiedProgress}%</p>
          <span className="text-[10px] font-bold text-blue-500">Unverified Claims</span>
        </div>

        <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Steps</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalStepsCount}</p>
          <span className="text-[10px] font-bold text-purple-500">Sequential Pipeline</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-panel p-3 border border-slate-200/50 dark:border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Steps', count: totalStepsCount },
            { id: 'pending', label: 'Pending Verification', count: pendingStepsCount },
            { id: 'changes', label: 'Requested Revisions', count: changesRequestedCount },
            { id: 'approved', label: 'Approved Steps', count: approvedStepsCount },
            { id: 'audit', label: 'Audit Trail', count: auditLogs.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 text-[9px] font-black rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter step titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500/50 font-semibold text-xs w-full"
          />
        </div>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. STEPS VERIFICATION TABLE */}
      {activeTab !== 'audit' && (
        <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 rounded-2xl shadow-xl space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" /> Sequential Task Step Approvals
              </h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Inspect employee submitted evidence proof, criteria checklist, and execute sign-off decisions.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto w-full rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-slate-900/40">
            {/* Table Header */}
            <div className="grid grid-cols-[minmax(280px,2.2fr)_minmax(140px,1.1fr)_minmax(220px,1.8fr)_110px_150px_130px] items-center px-4 py-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-white/10 text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider min-w-[1030px]">
              <div>Step & Task Title</div>
              <div>Submitted By</div>
              <div>Expected Output</div>
              <div className="text-center">Deadline</div>
              <div className="text-center">Status</div>
              <div className="text-center">Action</div>
            </div>

            {/* Table Body Rows */}
            <div className="divide-y divide-slate-200/40 dark:divide-white/5 min-w-[1030px]">
              {filteredSteps.map((step) => {
                const isApproved = step.status === 'APPROVED_COMPLETED';
                const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
                const isChanges = step.status === 'CHANGES_REQUESTED';

                return (
                  <div
                    key={step.id}
                    className="grid grid-cols-[minmax(280px,2.2fr)_minmax(140px,1.1fr)_minmax(220px,1.8fr)_110px_150px_130px] items-center px-4 py-3.5 hover:bg-slate-500/5 transition-colors font-bold text-xs text-slate-700 dark:text-slate-300 group"
                  >
                    {/* Column 1: Step & Task Title */}
                    <div className="pr-4 min-w-0">
                      <h4 className="font-black text-slate-900 dark:text-white text-xs line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {step.title}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {step.objective}
                      </p>
                    </div>

                    {/* Column 2: Submitted By */}
                    <div className="pr-2 min-w-0">
                      {step.evidence ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={getAvatarByName(step.evidence.submittedBy.name)}
                            alt="avatar"
                            className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-emerald-500/20"
                          />
                          <span className="font-black text-slate-900 dark:text-white truncate text-xs">
                            {step.evidence.submittedBy.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold italic">
                          Not Submitted
                        </span>
                      )}
                    </div>

                    {/* Column 3: Expected Output */}
                    <div className="pr-3 min-w-0">
                      <p className="font-medium text-slate-600 dark:text-slate-350 text-xs line-clamp-2 leading-relaxed" title={step.expectedOutput}>
                        {step.expectedOutput}
                      </p>
                    </div>

                    {/* Column 4: Deadline */}
                    <div className="text-center whitespace-nowrap font-bold text-slate-500 dark:text-slate-400 text-xs">
                      {step.deadline}
                    </div>

                    {/* Column 5: Status Badge */}
                    <div className="flex items-center justify-center">
                      <span
                        className={`w-full max-w-[135px] px-2.5 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-wider text-center whitespace-nowrap flex items-center justify-center shadow-2xs ${
                          isApproved
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                            : isPending
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 animate-pulse'
                            : isChanges
                            ? 'bg-amber-500/20 text-amber-600 border-amber-500/30 dark:text-amber-300'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {step.status === 'APPROVED_COMPLETED' ? 'APPROVED / COMPLETED' : step.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Column 6: Action Button */}
                    <div className="flex items-center justify-center">
                      {isTeamLeader && isPending ? (
                        <button
                          onClick={() => setInspectingStep(step)}
                          className="w-full max-w-[120px] h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-[11px] shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1 shrink-0"
                        >
                          Inspect & Verify →
                        </button>
                      ) : (
                        <button
                          onClick={() => setInspectingStep(step)}
                          className="w-full max-w-[120px] h-8 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-[11px] border border-slate-200/50 dark:border-white/5 cursor-pointer transition-all flex items-center justify-center shrink-0"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. AUDIT & ACTIVITY HISTORY STREAM */}
      {activeTab === 'audit' && (
        <div className="glass-panel p-6 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-6">
          <div>
            <h2 className="text-md font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-500" /> Immutable Step Audit & Activity History
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chronological log of step submissions, Team Leader verification sign-offs, revision requests, and automatic unlocks.
            </p>
          </div>

          <div className="relative pl-6 space-y-6 border-l-2 border-slate-200 dark:border-white/10">
            {auditLogs.map((log) => (
              <div key={log.id} className="relative space-y-1">
                <span
                  className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                    log.action === 'STEP_APPROVED'
                      ? 'bg-emerald-500'
                      : log.action === 'WORK_SUBMITTED'
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                />
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{log.actorName} ({formatRoleName(log.actorRole, 'title')})</span>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded uppercase">
                      {log.action.replace('_', ' ')}
                    </span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-350 font-semibold">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSPECTION & VERIFICATION MODAL */}
      {inspectingStep && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain select-none">
          <div className="w-full max-w-xl max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" /> Step Work Evidence Inspection
              </h3>
              <button onClick={() => setInspectingStep(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-blue-500">{inspectingStep.title}</p>
              <p className="text-xs font-semibold text-slate-500">{inspectingStep.objective}</p>
            </div>

            {inspectingStep.evidence && (
              <div className="p-4 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between font-black text-[10px] text-emerald-500 uppercase">
                  <span>Submitted Work Evidence</span>
                  <span>By {inspectingStep.evidence.submittedBy.name}</span>
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                  {inspectingStep.evidence.description}
                </p>
              </div>
            )}

            {isTeamLeader && inspectingStep.status === 'PENDING_APPROVAL' && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Team Leader Review Feedback Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Notes or revision feedback for employee..."
                    value={reviewerNotes}
                    onChange={(e) => setReviewerNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => handleVerifyAction('REJECT')}
                    className="px-3 py-2 bg-rose-500/15 text-rose-500 border border-rose-500/30 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    ✖ Reject Step
                  </button>
                  <button
                    onClick={() => handleVerifyAction('REQUEST_CHANGES')}
                    className="px-3.5 py-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer"
                  >
                    🔄 Request Revisions
                  </button>
                  <button
                    onClick={() => handleVerifyAction('APPROVE')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
                  >
                    ✓ Approve & Unlock Next Step
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* TOAST FEEDBACK */}
      {toast.show && createPortal(
        <div className="fixed top-4 right-4 z-[99999] flex items-center gap-3 px-4.5 py-3 rounded-2xl border backdrop-blur-xl shadow-lg bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white">
          <span className={`text-sm font-black ${toast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>
            {toast.type === 'success' ? '✓' : '✖'}
          </span>
          <span className="text-xs font-black tracking-wide">{toast.message}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
