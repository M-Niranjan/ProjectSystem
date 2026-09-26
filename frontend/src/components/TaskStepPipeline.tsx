import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  ShieldCheck,
  FileText,
  Link,
  Paperclip,
  CheckSquare,
  Sparkles,
  UserCheck,
  MessageSquare,
  X,
  Plus,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import {
  useStepVerificationStore,
  TaskStep,
  StepStatus,
} from '../store/useStepVerificationStore';
import {
  getTaskSteps,
  calculateStepProgress,
  submitStepWork,
  verifyStepWork,
} from '../services/stepVerificationService';

interface TaskStepPipelineProps {
  taskId: number;
  taskTitle: string;
  onProgressUpdate?: (verifiedProgress: number) => void;
}

export default function TaskStepPipeline({ taskId, taskTitle, onProgressUpdate }: TaskStepPipelineProps) {
  const { user } = useAuthStore();
  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';

  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Modal State (Employee)
  const [submittingStep, setSubmittingStep] = useState<TaskStep | null>(null);
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitCodeRef, setSubmitCodeRef] = useState('');

  // Verify Modal State (Team Leader)
  const [verifyingStep, setVerifyingStep] = useState<TaskStep | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Lock background scroll when step submission or verification modal is open
  useScrollLock(!!submittingStep || !!verifyingStep);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    useUIStore.getState().showToast(message, type);
  };

  const loadSteps = () => {
    setLoading(true);
    const data = getTaskSteps(taskId);
    setSteps(data);
    setLoading(false);

    const metrics = calculateStepProgress(data);
    if (onProgressUpdate) {
      onProgressUpdate(metrics.verifiedProgress);
    }
  };

  useEffect(() => {
    loadSteps();
  }, [taskId]);

  const metrics = calculateStepProgress(steps);

  // Handle Employee Submission
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingStep) return;
    if (!submitDescription.trim()) {
      showToast('Please provide a detailed description of the completed work.', 'error');
      return;
    }

    try {
      await submitStepWork(submittingStep.id, {
        description: submitDescription.trim(),
        links: submitLink.trim() ? [submitLink.trim()] : undefined,
        codeReferences: submitCodeRef.trim() ? [submitCodeRef.trim()] : undefined,
        submittedAt: new Date().toISOString(),
        submittedBy: { id: user?.id || 0, name: user?.name || 'User' },
      });

      showToast(`Step ${submittingStep.stepNumber} submitted for Team Leader verification!`, 'success');
      setSubmittingStep(null);
      setSubmitDescription('');
      setSubmitLink('');
      setSubmitCodeRef('');
      loadSteps();
    } catch (err) {
      showToast('Failed to submit step work.', 'error');
    }
  };

  // Handle Team Leader Verification
  const handleVerifyAction = async (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT') => {
    if (!verifyingStep) return;

    try {
      const res = await verifyStepWork(
        verifyingStep.id,
        action,
        { id: user?.id || 0, name: user?.name || 'Admin' },
        reviewerNotes
      );

      if (action === 'APPROVE') {
        showToast(
          `Step ${verifyingStep.stepNumber} APPROVED! ${
            res.unlockedStep ? `Step ${res.unlockedStep.stepNumber} is now UNLOCKED.` : 'All steps complete!'
          }`,
          'success'
        );
      } else if (action === 'REQUEST_CHANGES') {
        showToast(`Requested changes on Step ${verifyingStep.stepNumber}.`, 'info');
      } else {
        showToast(`Step ${verifyingStep.stepNumber} REJECTED.`, 'error');
      }

      setVerifyingStep(null);
      setReviewerNotes('');
      loadSteps();
    } catch (err) {
      showToast('Failed to complete verification decision.', 'error');
    }
  };

  return (
    <div className="space-y-5 select-none w-full min-w-0">
      {/* Header & Verified Progress Indicator */}
      <div className="glass-panel p-4 border border-slate-200/50 dark:border-white/5 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black tracking-tight text-slate-800 dark:text-white uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Sequential Step Approval Pipeline
            </h3>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Only Team Leader verified steps count toward official progress. Future steps unlock sequentially.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified Progress: {metrics.verifiedProgress}%
            </span>
            {metrics.selfReportedProgress > metrics.verifiedProgress && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-[10px] font-black flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Unverified Gap: +{metrics.selfReportedProgress - metrics.verifiedProgress}%
              </span>
            )}
          </div>
        </div>

        {/* Dual Progress Bars */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-emerald-500 flex items-center gap-1">
              ✓ Verified Completion ({metrics.approvedCount}/{metrics.totalSteps} Steps)
            </span>
            <span className="text-slate-400">
              {metrics.pendingCount > 0 ? `${metrics.pendingCount} Step(s) Pending Approval` : 'All Approved'}
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative flex">
            {/* Verified Approved Bar */}
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
              style={{ width: `${metrics.verifiedProgress}%` }}
            />
            {/* Unverified Pending Bar */}
            <div
              className="h-full bg-amber-400/80 dark:bg-amber-500/70 transition-all duration-500"
              style={{ width: `${metrics.selfReportedProgress - metrics.verifiedProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Pipeline List */}
      <div className="space-y-3.5">
        {steps.map((step) => {
          const isLocked = step.status === 'LOCKED';
          const isApproved = step.status === 'APPROVED_COMPLETED';
          const isPending = step.status === 'PENDING_APPROVAL' || step.status === 'SUBMITTED_FOR_REVIEW';
          const isChanges = step.status === 'CHANGES_REQUESTED';
          const isRejected = step.status === 'REJECTED';
          const isInProgress = step.status === 'IN_PROGRESS';

          return (
            <div
              key={step.id}
              className={`glass-panel p-4.5 rounded-2xl border transition-all space-y-3 ${
                isApproved
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isPending
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : isChanges
                  ? 'border-amber-500/50 bg-amber-500/10'
                  : isRejected
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : isInProgress
                  ? 'border-blue-500/40 bg-blue-500/5 shadow-md shadow-blue-500/5'
                  : 'border-slate-200/30 dark:border-white/5 opacity-60 bg-slate-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Status Badge Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isApproved
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : isPending
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 animate-pulse'
                        : isChanges || isRejected
                        ? 'bg-rose-500 text-white'
                        : isInProgress
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isApproved ? '✓' : isLocked ? <Lock className="w-4 h-4" /> : step.stepNumber}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">{step.title}</h4>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isPending
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : isChanges
                            ? 'bg-amber-500/25 text-amber-600 dark:text-amber-300 border-amber-500/40'
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : isInProgress
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}
                      >
                        {step.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-350 mt-1">
                      {step.objective}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" /> Due: {step.deadline}
                </span>
              </div>

              {/* Expected Output & Completion Criteria */}
              <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl space-y-2 text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  <strong>Expected Output:</strong> {step.expectedOutput}
                </p>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400">Completion Criteria Checklist:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-350">
                    {step.completionCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submitted Evidence View (If submitted/approved/changes) */}
              {step.evidence && (
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase">
                    <span>Submitted Evidence Proof</span>
                    <span>Submitted by {step.evidence.submittedBy.name}</span>
                  </div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{step.evidence.description}</p>
                  {step.evidence.links && step.evidence.links.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] text-blue-500 font-bold">
                      <Link className="w-3.5 h-3.5" />
                      <a href={step.evidence.links[0]} target="_blank" rel="noreferrer" className="underline">
                        {step.evidence.links[0]}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Team Leader Review Notes */}
              {step.reviewerNotes && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 space-y-1">
                  <p className="font-black text-[10px] uppercase">Team Leader Feedback:</p>
                  <p>{step.reviewerNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200/30 dark:border-white/5 flex items-center justify-between text-xs">
                <div>
                  {isLocked && (
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Locked until previous step approval
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Employee Action: Submit for Review */}
                  {!isTeamLeader && (isInProgress || isChanges || isRejected) && (
                    <button
                      onClick={() => setSubmittingStep(step)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Step for Review
                    </button>
                  )}

                  {/* Team Leader Action: Inspect & Verify */}
                  {isTeamLeader && isPending && (
                    <button
                      onClick={() => setVerifyingStep(step)}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck className="w-4 h-4" /> Inspect & Verify Step →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUBMIT WORK FORM MODAL (Employee) */}
      {submittingStep && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain select-none">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-500" /> Submit Step Work for Review
              </h3>
              <button onClick={() => setSubmittingStep(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-semibold">
              Step {submittingStep.stepNumber}: {submittingStep.title}
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Work Description & Accomplishments *</label>
                <textarea
                  rows={3}
                  placeholder="Detail the work completed and how criteria were met..."
                  value={submitDescription}
                  onChange={(e) => setSubmitDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Link / PR Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="https://github.com/org/repo/pull/12"
                  value={submitLink}
                  onChange={(e) => setSubmitLink(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittingStep(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs shadow-md cursor-pointer"
                >
                  Confirm Submission →
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* TEAM LEADER VERIFICATION MODAL */}
      {verifyingStep && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 touch-none overscroll-contain select-none">
          <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl space-y-4 text-slate-900 dark:text-white modal-dialog-contain overscroll-contain">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
              <h3 className="text-sm font-black text-amber-500 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> Team Leader Step Verification
              </h3>
              <button onClick={() => setVerifyingStep(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {verifyingStep.evidence && (
              <div className="p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl text-xs space-y-1">
                <p className="font-black text-blue-500">Submitted Proof by {verifyingStep.evidence.submittedBy.name}:</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">{verifyingStep.evidence.description}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Team Leader Review Feedback Notes</label>
              <textarea
                rows={3}
                placeholder="Provide notes or revision instructions for employee..."
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => handleVerifyAction('REJECT')}
                className="px-3.5 py-2 bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl font-bold text-xs cursor-pointer"
              >
                ✖ Reject Step
              </button>
              <button
                onClick={() => handleVerifyAction('REQUEST_CHANGES')}
                className="px-3.5 py-2 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl font-bold text-xs cursor-pointer"
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
        </div>,
        document.body
      )}

    </div>
  );
}
