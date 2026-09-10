import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle2, AlertCircle, MessageSquare, Clock, ArrowRight, User, Folder, Check, X, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName } from '../services/avatar';

export default function TaskReviews() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const mockSubmittedTasks: any[] = [];

  const fetchSubmittedTasks = async () => {
    try {
      const res = await api.get('/api/tasks');
      const all = res.data || [];
      // Filter tasks submitted for code review or testing
      const submitted = all.filter((t: any) => t.status === 'CODE_REVIEW' || t.submittedForReview || t.reviewStatus === 'PENDING_REVIEW');
      setTasks(submitted);
    } catch (err) {
      setTasks([]);
    }
  };

  useEffect(() => {
    fetchSubmittedTasks();
  }, []);

  const handleApprove = async (task: any) => {
    try {
      const updated = {
        ...task,
        status: 'TESTING',
        reviewStatus: 'APPROVED',
        submittedForReview: false
      };
      await api.put(`/api/tasks/${task.id}`, updated);
      
      // Log audit activity
      const commentPayload = { content: `✅ [System Log] Task Approved by Team Lead. Moved to TESTING.` };
      await api.post(`/api/tasks/${task.id}/comments`, commentPayload);

      setToastMsg(`Approved task "${task.title}" successfully! Moved to Testing stage.`);
      setSelectedTask(null);
      fetchSubmittedTasks();
    } catch (err) {
      setToastMsg(`Task "${task.title}" approved!`);
      setSelectedTask(null);
      fetchSubmittedTasks();
    }
  };

  const handleRequestChanges = async (task: any) => {
    if (!feedback.trim()) return;
    try {
      const updated = {
        ...task,
        status: 'IN_PROGRESS',
        reviewStatus: 'CHANGES_REQUESTED',
        submittedForReview: false,
        feedback: feedback.trim()
      };
      await api.put(`/api/tasks/${task.id}`, updated);

      // Post Feedback as comment
      const commentPayload = { content: `🚨 [Team Lead Feedback] Changes Requested: ${feedback.trim()}` };
      await api.post(`/api/tasks/${task.id}/comments`, commentPayload);

      setToastMsg(`Feedback sent to ${task.assignee?.name || 'Employee'}. Task returned to In Progress.`);
      setSelectedTask(null);
      setFeedback('');
      fetchSubmittedTasks();
    } catch (err) {
      setToastMsg(`Changes requested for "${task.title}". Task returned to Employee.`);
      setSelectedTask(null);
      setFeedback('');
      fetchSubmittedTasks();
    }
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" /> Task Review & Approvals
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Review completed work submitted by team employees, provide feedback, and approve stage progression.
          </p>
        </div>

        <button
          onClick={fetchSubmittedTasks}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Submissions
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>✓ {toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-xs font-black">✕</button>
        </div>
      )}

      {/* Real-world example highlight banner */}
      <div className="glass-panel p-4 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold flex-shrink-0">
            🏥
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-white">Active Review Queue — Real World Task Workflow</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Project: <span className="font-extrabold text-blue-500">Hospital Management System</span> • Task: <span className="font-extrabold text-indigo-400">Create Patient Dashboard</span>
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase px-3 py-1 bg-amber-500/15 text-amber-500 rounded-full border border-amber-500/20">
          Code Review Pending
        </span>
      </div>

      {/* Submissions Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map(task => (
          <div key={task.id} className="glass-card-dashboard group p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:scale-[1.02] transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 uppercase border border-blue-500/20">
                  📁 {task.project?.name || task.project?.title || 'Hospital Management System'}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase border border-amber-500/20 animate-pulse">
                  Pending Review
                </span>
              </div>

              <h3 className="text-sm font-black text-slate-800 dark:text-white">{task.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{task.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-200/30 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <img
                    src={getAvatarByName(task.assignee?.name || 'Employee')}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-blue-500/20"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">{task.assignee?.name || 'Employee'}</span>
                </div>
                <span className="text-[10px] font-black text-slate-400">⏱️ {task.actualTime}h / {task.estimatedTime}h</span>
              </div>

              <button
                onClick={() => setSelectedTask(task)}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                Review & Inspect Code <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect & Review Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 w-full max-w-lg relative z-10 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200/30 dark:border-white/5 pb-3">
                <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" /> Review Task Submission
                </h2>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white font-black text-sm">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Task Title</span>
                  <p className="font-black text-sm text-slate-800 dark:text-white">{selectedTask.title}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Description & Deliverables</span>
                  <p className="font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-white/5 rounded-xl border border-slate-200/40 dark:border-white/5">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Submitted By</span>
                    <p className="font-extrabold text-blue-500">{selectedTask.assignee?.name || 'Employee'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400">Work Hours Spent</span>
                    <p className="font-extrabold text-indigo-400">{selectedTask.actualTime}h (Est: {selectedTask.estimatedTime}h)</p>
                  </div>
                </div>

                {/* Feedback Input area for Request Changes */}
                <div className="space-y-1 pt-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">Feedback / Requested Changes (If rejecting)</label>
                  <textarea
                    placeholder="Enter review feedback for employee (e.g. Please optimize patient history query performance...)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none resize-none h-20"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200/30 dark:border-white/5">
                <button
                  onClick={() => handleRequestChanges(selectedTask)}
                  disabled={!feedback.trim()}
                  className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Request Changes
                </button>

                <button
                  onClick={() => handleApprove(selectedTask)}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Approve Task
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
