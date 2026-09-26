import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, AlertCircle, MessageSquare, Clock, ArrowRight, User, Folder, Check, X, RefreshCw, CheckCheck, Sparkles, Shield } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName, resolveAvatar } from '../services/avatar';
import { useAuthStore } from '../store/useAuthStore';
import { useScrollLock } from '../hooks/useScrollLock';

interface ReviewTask {
  id: number;
  title: string;
  description: string;
  status: string;
  reviewStatus?: string;
  submittedForReview?: boolean;
  project?: { id: number; name?: string; title?: string };
  assignee?: { id: number; name: string; role?: string; email?: string; profilePhoto?: string; gender?: string };
  actualTime?: number;
  estimatedTime?: number;
  priority?: string;
}

export default function TaskReviews() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [feedback, setFeedback] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Freeze background completely when Review Task Submission modal is active
  useScrollLock(!!selectedTask);

  const defaultPendingTasks: ReviewTask[] = [
    {
      id: 101,
      title: 'Create Patient Dashboard Interface',
      description: 'Implement patient medical history cards, vital signs monitoring widget, and real-time consultation booking queue for hospital staff.',
      status: 'CODE_REVIEW',
      reviewStatus: 'PENDING_REVIEW',
      submittedForReview: true,
      project: { id: 1, name: 'Hospital Management System', title: 'Hospital Management System' },
      assignee: { id: 1002, name: 'Rahul', role: 'ROLE_EMPLOYEE' },
      actualTime: 6.5,
      estimatedTime: 8.0,
      priority: 'HIGH'
    },
    {
      id: 102,
      title: 'Doctor Consultation Booking API',
      description: 'Build secure doctor slot reservation endpoints, conflict detection algorithms, and prescription generation webhooks.',
      status: 'CODE_REVIEW',
      reviewStatus: 'PENDING_REVIEW',
      submittedForReview: true,
      project: { id: 1, name: 'Hospital Management System', title: 'Hospital Management System' },
      assignee: { id: 1001, name: 'Ramesh', role: 'ROLE_EMPLOYEE' },
      actualTime: 9.0,
      estimatedTime: 12.0,
      priority: 'HIGH'
    },
    {
      id: 103,
      title: 'Multi-Currency Budget Calculation Engine',
      description: 'Engine for enterprise project budget calculation supporting USD, INR, EUR, GBP, JPY, and AED currency conversions.',
      status: 'CODE_REVIEW',
      reviewStatus: 'PENDING_REVIEW',
      submittedForReview: true,
      project: { id: 2, name: 'Workflow Integration Suite', title: 'Workflow Integration Suite' },
      assignee: { id: 1003, name: 'Manju', role: 'ROLE_EMPLOYEE' },
      actualTime: 4.0,
      estimatedTime: 5.5,
      priority: 'MEDIUM'
    }
  ];

  const fetchSubmittedTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/tasks');
      const all: ReviewTask[] = res.data || [];
      // Filter tasks submitted for code review or testing
      const submitted = all.filter((t) => t.status === 'CODE_REVIEW' || t.submittedForReview || t.reviewStatus === 'PENDING_REVIEW');
      
      if (submitted.length > 0) {
        setTasks(submitted);
      } else {
        // Check local storage for persisted review queue or use defaults
        const stored = localStorage.getItem('mock_pending_review_tasks');
        if (stored) {
          try {
            setTasks(JSON.parse(stored));
          } catch (e) {
            setTasks(defaultPendingTasks);
          }
        } else {
          setTasks(defaultPendingTasks);
        }
      }
    } catch (err) {
      const stored = localStorage.getItem('mock_pending_review_tasks');
      setTasks(stored ? JSON.parse(stored) : defaultPendingTasks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedTasks();
  }, []);

  const handleApprove = async (task: ReviewTask) => {
    try {
      const updated = {
        ...task,
        status: 'TESTING',
        reviewStatus: 'APPROVED',
        submittedForReview: false
      };

      try {
        await api.put(`/api/tasks/${task.id}`, updated);
        const approverName = user?.name || (user?.role === 'ROLE_ADMIN' ? 'Admin' : 'Team Lead');
        await api.post(`/api/tasks/${task.id}/comments`, {
          content: `✅ [System Log] Task Approved by ${approverName}. Moved to TESTING.`
        });
      } catch (apiErr) {
        console.log('Mock sync for task approval');
      }

      // Update local state and storage
      setTasks(prev => {
        const next = prev.filter(t => t.id !== task.id);
        localStorage.setItem('mock_pending_review_tasks', JSON.stringify(next));
        return next;
      });

      // Notify dashboard counters
      window.dispatchEvent(new CustomEvent('task-status-updated'));

      setToastMsg(`Approved task "${task.title}" successfully! Moved to Testing stage.`);
      setSelectedTask(null);
    } catch (err) {
      setToastMsg(`Task "${task.title}" approved!`);
      setSelectedTask(null);
    }
  };

  const handleRequestChanges = async (task: ReviewTask) => {
    if (!feedback.trim()) return;
    try {
      const updated = {
        ...task,
        status: 'IN_PROGRESS',
        reviewStatus: 'CHANGES_REQUESTED',
        submittedForReview: false,
        feedback: feedback.trim()
      };

      try {
        await api.put(`/api/tasks/${task.id}`, updated);
        const reviewerRole = user?.role === 'ROLE_ADMIN' ? 'Administrator' : 'Team Lead';
        await api.post(`/api/tasks/${task.id}/comments`, {
          content: `🚨 [${reviewerRole} Feedback] Changes Requested: ${feedback.trim()}`
        });
      } catch (apiErr) {
        console.log('Mock sync for changes requested');
      }

      setTasks(prev => {
        const next = prev.filter(t => t.id !== task.id);
        localStorage.setItem('mock_pending_review_tasks', JSON.stringify(next));
        return next;
      });

      window.dispatchEvent(new CustomEvent('task-status-updated'));

      setToastMsg(`Feedback sent to ${task.assignee?.name || 'Employee'}. Task returned to In Progress.`);
      setSelectedTask(null);
      setFeedback('');
    } catch (err) {
      setToastMsg(`Changes requested for "${task.title}". Task returned to Employee.`);
      setSelectedTask(null);
      setFeedback('');
    }
  };

  const handleResetQueue = () => {
    localStorage.removeItem('mock_pending_review_tasks');
    setTasks(defaultPendingTasks);
    setToastMsg('Sample code review queue reset with 3 submissions ready for review.');
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500 flex-shrink-0" /> Task Review & Approvals
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              {user?.role === 'ROLE_ADMIN' ? 'Admin & Lead Access' : 'Team Lead'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Review completed code submitted by team employees, provide feedback, and approve stage progression.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchSubmittedTasks}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {tasks.length === 0 && (
            <button
              type="button"
              onClick={handleResetQueue}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Submissions</span>
            </button>
          )}
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {toastMsg}
          </span>
          <button type="button" onClick={() => setToastMsg('')} className="text-xs font-black hover:opacity-70 cursor-pointer">✕</button>
        </div>
      )}

      {/* Real-world example highlight banner */}
      <div className="glass-panel p-4 sm:p-5 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xl flex-shrink-0">
            🏥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">Active Review Queue</span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">Ready for Sign-Off</span>
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white mt-0.5">Hospital Management System — Task Review Queue</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Authorized for <strong className="text-slate-700 dark:text-slate-200">Administrator</strong> and <strong className="text-slate-700 dark:text-slate-200">Team Lead</strong> governance.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 self-start sm:self-center">
          Pending in Queue: <strong className="text-blue-500 font-mono text-sm">{tasks.length}</strong>
        </span>
      </div>

      {/* Submissions Queue */}
      {tasks.length === 0 ? (
        <div className="glass-panel p-10 text-center space-y-4 rounded-3xl border border-dashed border-slate-300 dark:border-white/10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <CheckCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-white">All Submissions Approved!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              There are no tasks currently waiting for code review. All deliverables have been signed off.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetQueue}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> Reload Sample Review Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tasks.map(task => (
            <div key={task.id} className="glass-card-dashboard group p-5 flex flex-col justify-between space-y-4 hover:border-blue-500/40 hover:shadow-lg transition-all rounded-2xl">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase border border-blue-500/20 truncate max-w-[170px]">
                    📁 {task.project?.name || task.project?.title || 'Workspace Project'}
                  </span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase border border-amber-500/20 animate-pulse whitespace-nowrap">
                    Pending Review
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{task.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{task.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-200/30 dark:border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={resolveAvatar(task.assignee?.profilePhoto, task.assignee?.name || 'Employee', (task.assignee as any)?.gender)}
                      alt="avatar"
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/20"
                    />
                    <div className="text-left">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block leading-tight">{task.assignee?.name || 'Employee'}</span>
                      <span className="text-[9px] text-slate-400 font-mono">Team Employee</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 font-mono">⏱️ {task.actualTime || 6.5}h / {task.estimatedTime || 8}h</span>
                </div>

                {/* Mobile Friendly Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(task)}
                    className="py-2 px-3 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/25 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Quick Approve Task"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect & Review Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 touch-none overscroll-contain select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm touch-none overscroll-none"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel p-5 sm:p-6 w-full max-w-lg relative z-10 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-200/50 dark:border-white/10 modal-dialog-contain overscroll-contain"
            >
              <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-white/5 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-500">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                      Review Task Submission
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">Verify deliverables before moving to Testing</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Task Title</span>
                  <p className="font-black text-sm text-slate-800 dark:text-white mt-0.5">{selectedTask.title}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description & Deliverables</span>
                  <p className="font-medium text-slate-600 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200/40 dark:border-white/5">
                    {selectedTask.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-slate-200/40 dark:border-white/5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Submitted By</span>
                    <p className="font-extrabold text-blue-500 flex items-center gap-1.5 mt-0.5">
                      <img
                        src={resolveAvatar(selectedTask.assignee?.profilePhoto, selectedTask.assignee?.name || 'Employee', (selectedTask.assignee as any)?.gender)}
                        alt="avatar"
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span>{selectedTask.assignee?.name || 'Employee'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Work Hours Spent</span>
                    <p className="font-extrabold text-indigo-400 mt-0.5">
                      {selectedTask.actualTime || 6.5}h <span className="text-slate-400 font-normal text-[10px]">(Est: {selectedTask.estimatedTime || 8}h)</span>
                    </p>
                  </div>
                </div>

                {/* Feedback Input area for Request Changes */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Feedback / Requested Changes (Optional for rejection)
                  </label>
                  <textarea
                    placeholder="Enter review feedback for employee (e.g. Please optimize queries and verify mobile viewport alignment...)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-200/30 dark:border-white/5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleRequestChanges(selectedTask)}
                  disabled={!feedback.trim()}
                  className="px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 transition-all"
                >
                  Request Changes
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(selectedTask)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Advance</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
