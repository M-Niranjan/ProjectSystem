import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Building2, 
  Briefcase, 
  Info,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import { resolveAvatar } from '../services/avatar';
import { useScrollLock } from '../hooks/useScrollLock';

export interface EligibleEmployee {
  id: string;
  uid: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: string;
  gender?: string;
  profilePhoto?: string | null;
  skills?: string;
  experience?: number;
  currentTeam: string;
  currentTeamLeaderId: string | null;
  currentTeamLeaderName: string | null;
  isAssignedToOtherTeam: boolean;
  canInvite: boolean;
}

interface InviteTeammateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess: () => Promise<void> | void;
}

export default function InviteTeammateModal({ isOpen, onClose, onInviteSuccess }: InviteTeammateModalProps) {
  // Lock background scroll when Invite Teammates modal is open
  useScrollLock(isOpen);

  const [employees, setEmployees] = useState<EligibleEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED'>('ALL');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Fetch eligible employees from backend (Firestore Source of Truth)
  const fetchEligibleTeammates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/teams/eligible-teammates');
      const data = Array.isArray(res.data) ? res.data : [];
      setEmployees(data);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error fetching eligible teammates:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load eligible teammates from Firestore.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIds(new Set());
      setSuccessMsg(null);
      setError(null);
      setShowConfirmation(false);
      fetchEligibleTeammates();
    }
  }, [isOpen]);

  // Filter employees by search query and tab
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees.filter(emp => {
      // Search matching
      const matchesSearch = 
        !q ||
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (emp.designation || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Tab filter
      if (filterTab === 'AVAILABLE') {
        return emp.canInvite;
      }
      if (filterTab === 'ASSIGNED') {
        return emp.isAssignedToOtherTeam;
      }
      return true;
    });
  }, [employees, searchQuery, filterTab]);

  // Available employees count
  const availableCount = useMemo(() => {
    return employees.filter(e => e.canInvite).length;
  }, [employees]);

  // Selected employees list
  const selectedEmployees = useMemo(() => {
    return employees.filter(e => selectedIds.has(e.uid || e.id));
  }, [employees, selectedIds]);

  // Toggle selection for a single employee
  const handleToggleSelect = (uid: string, canInvite: boolean) => {
    if (!canInvite) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Select all available employees in the current filtered view
  const handleSelectAllAvailable = () => {
    const availableInView = filteredEmployees.filter(e => e.canInvite).map(e => e.uid || e.id);
    const allSelected = availableInView.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        availableInView.forEach(id => next.delete(id));
      } else {
        availableInView.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Submit invitation to backend
  const handleSendInvitations = async () => {
    if (selectedIds.size === 0) return;
    setInviting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = { employeeIds: Array.from(selectedIds) };
      const res = await api.post('/api/teams/invite-teammates', payload);
      
      const successText = res.data?.message || `Successfully added ${selectedIds.size} teammate(s) to your team.`;
      setSuccessMsg(successText);
      setShowConfirmation(false);

      // Trigger automatic instant refresh in parent component
      await onInviteSuccess();

      // Brief delay so user sees confirmation before closing
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error inviting teammates:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to send team invitation. Please try again.';
      setError(msg);
      setShowConfirmation(false);
    } finally {
      setInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md select-none touch-none overscroll-contain">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="glass-panel w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/60 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto modal-dialog-contain overscroll-contain"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0 shadow-sm shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                Invite Teammates
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                  Admin Provisioned
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Select eligible employees from the organization directory to join your team.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start justify-between gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchEligibleTeammates}
              className="text-[11px] underline hover:no-underline cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Content View (Step 1: Selection OR Step 2: Confirmation) */}
        {!showConfirmation ? (
          <>
            {/* Search & Filter Toolbar */}
            <div className="p-4 sm:p-6 pb-2 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employees by name, email, department, or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs & Quick Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setFilterTab('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'ALL'
                        ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    All ({employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('AVAILABLE')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'AVAILABLE'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Available ({availableCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('ASSIGNED')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'ASSIGNED'
                        ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Other Teams ({employees.length - availableCount})
                  </button>
                </div>

                {/* Select All in view toggle */}
                {availableCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllAvailable}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {filteredEmployees.filter(e => e.canInvite).every(e => selectedIds.has(e.uid || e.id)) && filteredEmployees.filter(e => e.canInvite).length > 0
                      ? 'Deselect All'
                      : 'Select All Available'}
                  </button>
                )}
              </div>
            </div>

            {/* Teammates List (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 divide-y divide-slate-100 dark:divide-white/5 min-h-[220px]">
              {loading ? (
                /* Skeleton Loading State */
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-100/50 dark:bg-white/5 animate-pulse flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10" />
                        <div className="space-y-1.5">
                          <div className="w-32 h-3.5 bg-slate-200 dark:bg-white/10 rounded" />
                          <div className="w-48 h-2.5 bg-slate-200 dark:bg-white/10 rounded" />
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : filteredEmployees.length === 0 ? (
                /* Clean Empty State */
                <div className="py-12 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400">
                    <Users className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">
                    {searchQuery ? 'No matching employees found' : 'No available teammates found'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                    {searchQuery
                      ? 'Try adjusting your search query or switching filter tabs.'
                      : 'All employees created by the administrator are currently assigned or no active employee profiles exist in the system.'}
                  </p>
                </div>
              ) : (
                /* Employee Item List */
                filteredEmployees.map(emp => {
                  const empUid = emp.uid || emp.id;
                  const isSelected = selectedIds.has(empUid);
                  const isAvailable = emp.canInvite;

                  return (
                    <div
                      key={empUid}
                      onClick={() => handleToggleSelect(empUid, isAvailable)}
                      className={`py-3 sm:py-3.5 px-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                        isAvailable
                          ? isSelected
                            ? 'bg-blue-500/10 border border-blue-500/30 dark:bg-blue-500/15 cursor-pointer shadow-sm'
                            : 'hover:bg-slate-100/60 dark:hover:bg-white/5 cursor-pointer border border-transparent'
                          : 'opacity-60 bg-slate-50/50 dark:bg-white/[0.02] cursor-not-allowed border border-transparent'
                      }`}
                    >
                      {/* Checkbox & Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                            !isAvailable
                              ? 'border border-slate-300 dark:border-white/10 bg-slate-200/50 dark:bg-white/5 text-transparent'
                              : isSelected
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/30'
                              : 'border-2 border-slate-300 dark:border-white/20 hover:border-blue-500 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>

                        {/* Avatar */}
                        <img
                          src={resolveAvatar(emp.profilePhoto, emp.name, emp.gender)}
                          alt={emp.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
                        />

                        {/* Details */}
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                              {emp.name}
                            </p>
                            {emp.status && emp.status.toLowerCase() !== 'active' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium truncate">
                            {emp.email}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate flex items-center gap-1.5">
                            <span>{emp.designation || 'Software Engineer'}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span>{emp.department || 'Engineering'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status / Team Assignment Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {emp.canInvite ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Available
                          </span>
                        ) : emp.isAssignedToOtherTeam ? (
                          <div className="text-right">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Assigned
                            </span>
                            <p className="text-[9.5px] font-semibold text-slate-400 mt-0.5 truncate max-w-[120px]">
                              {emp.currentTeam}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/30">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Confirmation Step Dialogue */
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Confirm Team Invitation
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  You are about to invite <strong className="text-blue-500 font-bold">{selectedEmployees.length}</strong> teammate(s) to your team.
                  Their membership will be saved permanently in Firestore.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Selected Teammates ({selectedEmployees.length})
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200/50 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] p-2 max-h-56 overflow-y-auto">
                {selectedEmployees.map(emp => (
                  <div key={emp.uid || emp.id} className="py-2.5 px-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={resolveAvatar(emp.profilePhoto, emp.name, emp.gender)}
                        alt={emp.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">{emp.name}</p>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {emp.designation || 'Software Engineer'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-slate-200/50 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {selectedIds.size > 0 ? (
              <span className="text-blue-500 font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {selectedIds.size} teammate{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>Select teammates from the list</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {showConfirmation ? (
              <>
                <button
                  type="button"
                  disabled={inviting}
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={inviting}
                  onClick={handleSendInvitations}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {inviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adding to Team...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Confirm & Add to Team
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200/70 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-white rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedIds.size === 0 || loading}
                  onClick={() => setShowConfirmation(true)}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Invite Selected ({selectedIds.size})
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
