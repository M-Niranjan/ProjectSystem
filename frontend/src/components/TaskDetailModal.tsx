import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, User, Shield, Clock, Play, Pause, Square, Sparkles, MessageSquare, Send, Paperclip, CheckSquare, ListTodo, Plus, Info, Link, AlertCircle, UserCheck } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  estimatedTime: number;
  actualTime: number;
  subtasksCount?: number;
  completedSubtasksCount?: number;
  assignee?: { id: number; name: string; profilePhoto?: string };
  reviewer?: { id: number; name: string; profilePhoto?: string };
  project: { id: number; name: string };
  dependencies?: Task[];
}

interface Comment {
  id: number;
  content: string;
  user: { id: number; name: string; profilePhoto?: string };
  createdAt: string;
}

interface Attachment {
  id: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
}

export default function TaskDetailModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const { user } = useAuthStore();
  const { setChatContactId, setView } = useUIStore();

  const startChatWithMember = (memberId: number) => {
    setChatContactId(memberId);
    setView('messages');
    setIsOpen(false);
  };

  // Comments & Attachments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subtasks list
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Task Timer (Stopwatch)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleOpenDetail = (e: Event) => {
      const taskData = (e as CustomEvent).detail;
      setTask(taskData);
      setIsOpen(true);
      fetchDetails(taskData.id);
    };

    window.addEventListener('open-task-detail', handleOpenDetail);
    return () => window.removeEventListener('open-task-detail', handleOpenDetail);
  }, []);

  // Timer Tick hook
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const fetchDetails = async (taskId: number) => {
    try {
      // Fetch comments
      const commRes = await api.get(`/api/tasks/${taskId}/comments`);
      setComments(commRes.data);
      
      // Fetch attachments
      const attachRes = await api.get(`/api/attachments/task/${taskId}`);
      setAttachments(attachRes.data);
    } catch (err) {
      // Mock fallbacks
      setComments([
        { id: 1, content: 'Alice, make sure the border radius matches the standard 16px variables.', user: { id: 2, name: 'Bob Johnson' }, createdAt: '2026-07-14T11:20:00Z' },
        { id: 2, content: 'Already on it! I am compiling the CSS variables right now.', user: { id: 1, name: 'Alice Smith' }, createdAt: '2026-07-14T11:45:00Z' }
      ]);
      setAttachments([
        { id: 1, fileName: 'Dashboard_Mockup.png', fileUrl: '#', fileType: 'image/png', createdAt: '2026-07-14T10:00:00Z' }
      ]);
    }

    // Default mock subtasks
    setSubtasks([
      { id: 1, title: 'Map Tailwind variables in index.css', completed: true },
      { id: 2, title: 'Add hover micro-interactions to task cards', completed: false },
      { id: 3, title: 'Configure GSAP magnetic button hooks', completed: false }
    ]);
  };

  const handleToggleSubtask = (subId: number) => {
    setSubtasks(subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s));
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub = {
      id: Date.now(),
      title: newSubtaskTitle.trim(),
      completed: false
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle('');
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    const payload = { content: newComment };

    try {
      const res = await api.post(`/api/tasks/${task.id}/comments`, payload);
      setComments([...comments, res.data]);
    } catch (err) {
      // Offline fallback
      const mockComm: Comment = {
        id: Date.now(),
        content: newComment,
        user: { id: user?.id || 1, name: user?.name || 'Alice Smith', profilePhoto: user?.profilePhoto },
        createdAt: new Date().toISOString()
      };
      setComments([...comments, mockComm]);
    }
    setNewComment('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !task) return;
    const file = files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('taskId', task.id.toString());

    setUploading(true);
    try {
      const res = await api.post('/api/attachments/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments([...attachments, res.data]);
    } catch (err) {
      // Offline mock upload
      const mockAttach: Attachment = {
        id: Date.now(),
        fileName: file.name,
        fileUrl: '#',
        fileType: file.type,
        createdAt: new Date().toISOString()
      };
      setAttachments([...attachments, mockAttach]);
    }
    setUploading(false);
  };

  const handleAISuggestions = async () => {
    if (!task) return;
    try {
      const res = await api.get(`/api/tasks/${task.id}/ai-subtasks`);
      const newItems = res.data.map((title: string, index: number) => ({
        id: Date.now() + index,
        title,
        completed: false
      }));
      setSubtasks([...subtasks, ...newItems]);
    } catch (err) {
      // Mock Suggestions fallback
      const fallbackSuggestions = [
        'Analyze layout container spacing sizes',
        'Add smooth cubic-bezier easing to slide cards',
        'Run CSS lint audits before committing build code'
      ].map((title, index) => ({
        id: Date.now() + index,
        title,
        completed: false
      }));
      setSubtasks([...subtasks, ...fallbackSuggestions]);
    }
  };

  // Timer controls
  const startTimer = () => setIsTimerRunning(true);
  const pauseTimer = () => setIsTimerRunning(false);
  const saveTimer = async () => {
    if (!task) return;
    setIsTimerRunning(false);
    const hours = parseFloat((timeElapsed / 3600).toFixed(2));
    if (hours === 0) {
      setTimeElapsed(0);
      return;
    }
    
    if (confirm(`Do you want to log ${hours} hours to this task?`)) {
      try {
        const res = await api.post(`/api/tasks/${task.id}/timer?additionalHours=${hours}`);
        setTask(res.data);
      } catch (err) {
        // Offline update
        setTask({ ...task, actualTime: task.actualTime + hours });
      }
      setTimeElapsed(0);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const isTeamLeader = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_MANAGER';
  const isAssignee = task && task.assignee && task.assignee.id === user?.id;
  const canEdit = isTeamLeader || isAssignee;

  return (
    <AnimatePresence>
      {isOpen && task && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          ></motion.div>

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-4xl h-[85vh] shadow-2xl relative border border-slate-200/50 dark:border-white/10 overflow-hidden flex flex-col md:flex-row"
          >
            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white z-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Column - Main Details & Comments */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-200/30 dark:border-white/5 space-y-6">
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{task.project.name}</p>
                <h2 className="text-xl font-black text-slate-800 dark:text-white mt-1">{task.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{task.description}</p>
              </div>

              {/* Subtasks checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-blue-500" /> Subtask Checklist
                  </h4>
                  {canEdit && (
                    <button
                      onClick={handleAISuggestions}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/15 text-[10px] font-black text-blue-500 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Autocomplete
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 text-xs py-1 px-2 bg-slate-100/30 dark:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(sub.id)}
                        className={`w-3.5 h-3.5 rounded border-slate-200 text-blue-600 ${!canEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                      <span className={`flex-1 font-bold ${sub.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {sub.title}
                      </span>
                    </div>
                  ))}
                </div>

                {canEdit && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add task checklist item..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                    <button
                      onClick={handleAddSubtask}
                      className="p-1.5 bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 rounded-xl cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Comments Stream */}
              <div className="space-y-3.5 border-t border-slate-200/30 dark:border-white/5 pt-6">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4.5 h-4.5 text-blue-500" /> Collaboration stream
                </h4>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {comments.map(c => {
                    const isSystemLog = c.content.startsWith('🚨 [System Log]');
                    if (isSystemLog) {
                      return (
                        <div key={c.id} className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 py-2 px-3 bg-slate-500/5 rounded-xl border border-dashed border-slate-200/50 dark:border-white/5 font-bold">
                          <AlertCircle className="w-4 h-4 text-blue-500/70 flex-shrink-0" />
                          <span className="flex-1 leading-normal">{c.content.replace('🚨 [System Log]', '').trim()}</span>
                          <span className="text-[8px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={c.id} className="flex gap-3 text-xs">
                        <img
                          src={c.user.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${c.user.name}`}
                          alt="avatar"
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/10 flex-shrink-0"
                        />
                        <div className="flex-1 bg-slate-100/50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-slate-800 dark:text-slate-200">{c.user.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-bold">{c.content}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handlePostComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a message to teammates..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Task Metadata & Timer controls */}
            <div className="w-full md:w-80 p-6 md:p-8 bg-slate-500/5 overflow-y-auto space-y-6">
              {/* Task stopwatch timer */}
              <div className="glass-panel p-4 border border-blue-500/20 bg-blue-500/5 rounded-2xl text-center space-y-3.5">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin-slow" /> Task Stopwatch
                </p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-widest">{formatTime(timeElapsed)}</h3>
                            <div className="flex justify-center gap-2">
                  {!isTimerRunning ? (
                    <button
                      onClick={startTimer}
                      disabled={!canEdit}
                      className={`p-2 bg-blue-600 text-white rounded-xl transition-all ${!canEdit ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-500 cursor-pointer'}`}
                      title={canEdit ? "Start Stopwatch" : "Stopwatch Locked"}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={pauseTimer}
                      disabled={!canEdit}
                      className={`p-2 bg-amber-500 text-white rounded-xl transition-all ${!canEdit ? 'opacity-30 cursor-not-allowed' : 'hover:bg-amber-400 cursor-pointer'}`}
                      title="Pause Stopwatch"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                    </button>
                  )}
                  
                  <button
                    onClick={saveTimer}
                    disabled={!canEdit || timeElapsed === 0}
                    className="p-2 bg-red-600 disabled:opacity-40 text-white rounded-xl hover:bg-red-500 transition-colors cursor-pointer"
                    title="Stop & Log Hours"
                  >
                    <Square className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>

              {/* Task parameters grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Assignee
                  </span>
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={task.assignee.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${task.assignee.name}`}
                        alt="avatar"
                        className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-blue-500/10"
                      />
                      <span className="font-black text-slate-800 dark:text-slate-200">{task.assignee.name}</span>
                      {task.assignee.id !== user?.id && (
                        <button
                          onClick={() => startChatWithMember(task.assignee!.id)}
                          className="p-1 hover:bg-white/10 rounded-lg text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                          title={`Send personal message to ${task.assignee.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Unassigned</span>
                  )}
                </div>

                {task.reviewer && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-purple-500" /> Reviewer
                    </span>
                    <div className="flex items-center gap-1.5">
                      <img
                        src={task.reviewer.profilePhoto || `https://api.dicebear.com/7.x/adventurer/svg?seed=${task.reviewer.name}`}
                        alt="avatar"
                        className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-purple-500/10"
                      />
                      <span className="font-black text-slate-800 dark:text-slate-200">{task.reviewer.name}</span>
                      {task.reviewer.id !== user?.id && (
                        <button
                          onClick={() => startChatWithMember(task.reviewer!.id)}
                          className="p-1 hover:bg-white/10 rounded-lg text-purple-500 hover:text-purple-400 transition-colors cursor-pointer"
                          title={`Send personal message to ${task.reviewer.name}`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Priority
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                    task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' :
                    task.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    {task.priority}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Due Date
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{task.dueDate}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> Budget Log
                  </span>
                  <span className="font-black text-slate-800 dark:text-slate-200">
                    {task.actualTime}h / {task.estimatedTime}h
                  </span>
                </div>
              </div>

              {/* Uploaded Documents attachments */}
              <div className="space-y-3.5 border-t border-slate-200/30 dark:border-white/5 pt-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-4.5 h-4.5 text-blue-500" /> Documents ({attachments.length})
                  </h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-1 hover:bg-white/10 text-blue-500 hover:text-blue-400 rounded transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 bg-slate-100/30 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 hover:border-blue-500/20 transition-all text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Link className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{att.fileName}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
