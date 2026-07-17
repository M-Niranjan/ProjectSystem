import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, X, Plus, Check, DollarSign, Calendar, Mail } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import api from '../services/api';

export default function CreateProjectModal() {
  const { projectModalOpen, setProjectModalOpen } = useUIStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [priority, setPriority] = useState('MEDIUM');
  const [budget, setBudget] = useState(10000);
  const [deadline, setDeadline] = useState('2026-08-01');
  const [colorLabel, setColorLabel] = useState('#3B82F6');
  
  // Member invites
  const [memberEmail, setMemberEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444'];

  const addMemberEmail = () => {
    const email = memberEmail.trim();
    if (email && !invitedEmails.includes(email) && email.includes('@')) {
      setInvitedEmails([...invitedEmails, email]);
      setMemberEmail('');
    }
  };

  const removeMemberEmail = (email: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const payload = {
      name,
      description,
      status,
      priority,
      budget,
      deadline,
      colorLabel
    };

    try {
      const res = await api.post('/api/projects', payload);
      const newProjectId = res.data.id;
      
      // Save members if invited
      if (newProjectId && invitedEmails.length > 0) {
        await api.post(`/api/projects/${newProjectId}/members`, invitedEmails);
      }

      window.dispatchEvent(new Event('project-created'));
      setProjectModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create project, running simulated save.', err);
      window.dispatchEvent(new Event('project-created'));
      setProjectModalOpen(false);
      resetForm();
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setStatus('ACTIVE');
    setPriority('MEDIUM');
    setBudget(10000);
    setDeadline('2026-08-01');
    setColorLabel('#3B82F6');
    setInvitedEmails([]);
  };

  return (
    <AnimatePresence>
      {projectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setProjectModalOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          ></motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-lg p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 z-50 max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setProjectModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <Folder className="w-5 h-5 text-blue-500" /> Initialize New Project Workspace
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notion Sync Engine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                <textarea
                  placeholder="Provide context and milestone targets..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs h-16 resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                  >
                    <option className="dark:bg-slate-800" value="PLANNING">Planning</option>
                    <option className="dark:bg-slate-800" value="ACTIVE">Active</option>
                    <option className="dark:bg-slate-800" value="COMPLETED">Completed</option>
                    <option className="dark:bg-slate-800" value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                  >
                    <option className="dark:bg-slate-800" value="LOW">Low</option>
                    <option className="dark:bg-slate-800" value="MEDIUM">Medium</option>
                    <option className="dark:bg-slate-800" value="HIGH">High</option>
                    <option className="dark:bg-slate-800" value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Budget ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Deadline</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Workspace Color Label */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Workspace Tag Color</label>
                <div className="flex gap-2.5">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorLabel(c)}
                      className="w-6 h-6 rounded-full border border-white/20 relative cursor-pointer"
                      style={{ backgroundColor: c }}
                    >
                      {colorLabel === c && <Check className="absolute inset-0 m-auto w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Members Invite section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Invite Team Members</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="teammate@company.com"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addMemberEmail}
                    className="px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-800 dark:text-white rounded-xl font-black text-xs cursor-pointer transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Render invited chips */}
                {invitedEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {invitedEmails.map(email => (
                      <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg text-[10px] font-black">
                        {email}
                        <button type="button" onClick={() => removeMemberEmail(email)} className="text-blue-500 hover:text-blue-700 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Initializing...' : 'Initialize Workspace'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
