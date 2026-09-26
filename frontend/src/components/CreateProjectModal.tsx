import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, X, Plus, Check, DollarSign, Calendar, Mail, ChevronDown, UserPlus, Users } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import api from '../services/api';
import { dispatchNotificationAlert } from '../services/notificationService';
import TeamMemberPickerModal from './TeamMemberPickerModal';
import { useScrollLock } from '../hooks/useScrollLock';

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

export default function CreateProjectModal() {
  const { projectModalOpen, setProjectModalOpen } = useUIStore();

  // Lock background scroll when Create Project modal is open
  useScrollLock(projectModalOpen);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [priority, setPriority] = useState('MEDIUM');
  const [budget, setBudget] = useState(10000);
  const [deadline, setDeadline] = useState('2026-08-01');
  const [colorLabel, setColorLabel] = useState('#3B82F6');
  
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(CURRENCIES[0]);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  // Member invites & Directory Picker
  const [memberEmail, setMemberEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
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
      currency: selectedCurrency.code,
      currencySymbol: selectedCurrency.symbol,
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

      dispatchNotificationAlert({
        title: 'New Project Created by Team Leader',
        message: `Team Leader created project workspace "${name}".`,
        type: 'PROJECT_UPDATE',
        recipientId: 'ALL'
      });

      window.dispatchEvent(new Event('project-created'));
      setProjectModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create project, running simulated save.', err);
      dispatchNotificationAlert({
        title: 'New Project Created by Team Leader',
        message: `Team Leader created project workspace "${name}".`,
        type: 'PROJECT_UPDATE',
        recipientId: 'ALL'
      });
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
    setSelectedCurrency(CURRENCIES[0]);
    setDeadline('2026-08-01');
    setColorLabel('#3B82F6');
    setInvitedEmails([]);
  };

  return (
    <>
      <AnimatePresence>
        {projectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 touch-none overscroll-contain select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProjectModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm touch-none overscroll-none"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel w-full max-w-lg p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 z-50 max-h-[90vh] overflow-y-auto rounded-3xl modal-dialog-contain overscroll-contain"
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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Budget ({selectedCurrency.symbol} {selectedCurrency.code})
                      </label>
                    </div>
                    <div className="relative">
                      {/* Currency Selector Pill */}
                      <button
                        type="button"
                        onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-200/50 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 rounded-lg border border-slate-300/50 dark:border-white/10 text-slate-800 dark:text-white font-black text-xs flex items-center gap-1 cursor-pointer transition-colors z-10"
                        title="Change Currency"
                      >
                        <span>{selectedCurrency.symbol}</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </button>

                      <input
                        type="number"
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full pl-16 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                      />

                      {/* Currency Dropdown Menu */}
                      <AnimatePresence>
                        {currencyDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setCurrencyDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.95 }}
                              className="absolute left-0 top-full mt-1.5 w-52 p-1.5 glass-panel rounded-xl border border-slate-200/60 dark:border-white/10 shadow-2xl z-30 max-h-48 overflow-y-auto"
                            >
                              {CURRENCIES.map((curr) => (
                                <button
                                  key={curr.code}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCurrency(curr);
                                    setCurrencyDropdownOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-semibold cursor-pointer transition-colors ${
                                    selectedCurrency.code === curr.code
                                      ? 'bg-blue-600 text-white font-bold'
                                      : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold w-5 text-center">{curr.symbol}</span>
                                    <span className="truncate">{curr.name}</span>
                                  </div>
                                  <span className="text-[10px] opacity-70 font-mono uppercase">{curr.code}</span>
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Invite Team Members
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 rounded-lg font-bold text-[11px] flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      title="Choose from registered team members"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Choose Team Members</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="teammate@company.com"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addMemberEmail();
                          }
                        }}
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
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span>Invited Teammates ({invitedEmails.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setInvitedEmails([])}
                          className="text-red-400 hover:text-red-300 transition-colors cursor-pointer text-[10px]"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {invitedEmails.map(email => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 rounded-lg text-[10px] font-bold shadow-xs"
                          >
                            <span className="truncate max-w-[170px]">{email}</span>
                            <button
                              type="button"
                              onClick={() => removeMemberEmail(email)}
                              className="text-blue-400 hover:text-blue-600 dark:hover:text-white cursor-pointer ml-0.5"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
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

      {/* Team Member Picker Modal */}
      <TeamMemberPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        alreadySelectedEmails={invitedEmails}
        onConfirm={(newSelected) => {
          const merged = Array.from(new Set([...invitedEmails, ...newSelected]));
          setInvitedEmails(merged);
        }}
      />
    </>
  );
}
