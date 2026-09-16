import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Search, Check, CheckSquare, Square, Shield, Briefcase, Code, UserCheck, Sparkles } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName } from '../services/avatar';

export interface DirectoryMember {
  id: number | string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: string;
  profilePhoto?: string;
}

interface TeamMemberPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  alreadySelectedEmails: string[];
  onConfirm: (selectedEmails: string[]) => void;
}

export default function TeamMemberPickerModal({
  isOpen,
  onClose,
  alreadySelectedEmails,
  onConfirm
}: TeamMemberPickerModalProps) {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Default fallback team if API returns empty
  const defaultFallbackMembers: DirectoryMember[] = [
    { id: 1, name: 'Niranjan M', email: 'niranjan@company.com', role: 'ROLE_ADMIN', designation: 'System Architect', department: 'Executive' },
    { id: 2, name: 'Ramesh Kumar', email: 'ramesh@company.com', role: 'ROLE_EMPLOYEE', designation: 'Full Stack Engineer', department: 'Engineering' },
    { id: 3, name: 'Rahul Sharma', email: 'rahul@company.com', role: 'ROLE_EMPLOYEE', designation: 'Frontend Developer', department: 'Engineering' },
    { id: 4, name: 'Manju Nathan', email: 'manju@company.com', role: 'ROLE_EMPLOYEE', designation: 'Backend Go/Java Developer', department: 'Engineering' },
    { id: 5, name: 'Vinay Patel', email: 'vinay@company.com', role: 'ROLE_EMPLOYEE', designation: 'QA Automation Lead', department: 'Quality Assurance' }
  ];

  // Load team members when opened
  useEffect(() => {
    if (!isOpen) return;

    // Sync already selected emails
    setSelectedEmails(new Set(alreadySelectedEmails));
    setSearchQuery('');
    setSelectedRoleFilter('ALL');

    const loadDirectory = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/teams');
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setMembers(res.data);
        } else {
          setMembers(defaultFallbackMembers);
        }
      } catch (err) {
        setMembers(defaultFallbackMembers);
      } finally {
        setLoading(false);
      }
    };

    loadDirectory();
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSelect = (email: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const getRoleBadge = (role: string) => {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) {
      return {
        label: 'Admin',
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        icon: Shield
      };
    }
    if (r.includes('LEAD') || r.includes('MANAGER')) {
      return {
        label: 'Team Lead',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        icon: Briefcase
      };
    }
    if (r.includes('QA')) {
      return {
        label: 'QA Engineer',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        icon: UserCheck
      };
    }
    return {
      label: 'Team Employee',
      bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: UserCheck
    };
  };

  // Filter members by query and role
  const filteredMembers = members.filter(m => {
    const query = searchQuery.trim().toLowerCase();
    const matchQuery =
      !query ||
      m.name.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      (m.department && m.department.toLowerCase().includes(query)) ||
      (m.designation && m.designation.toLowerCase().includes(query));

    if (!matchQuery) return false;

    if (selectedRoleFilter === 'ALL') return true;
    if (selectedRoleFilter === 'EMPLOYEE') {
      const isLeadOrAdmin = m.role?.toUpperCase().includes('LEAD') || m.role?.toUpperCase().includes('ADMIN') || m.role?.toUpperCase().includes('MANAGER');
      return !isLeadOrAdmin || m.role?.toUpperCase().includes('EMPLOYEE');
    }
    if (selectedRoleFilter === 'ADMIN') return m.role?.toUpperCase().includes('ADMIN');
    if (selectedRoleFilter === 'LEAD') return m.role?.toUpperCase().includes('LEAD') || m.role?.toUpperCase().includes('MANAGER');
    if (selectedRoleFilter === 'DEVELOPER') {
      const isLeadOrAdmin = m.role?.toUpperCase().includes('LEAD') || m.role?.toUpperCase().includes('ADMIN') || m.role?.toUpperCase().includes('MANAGER');
      const isQA = m.designation?.toLowerCase().includes('qa') || m.department?.toLowerCase().includes('quality');
      return !isLeadOrAdmin && !isQA;
    }
    if (selectedRoleFilter === 'QA') {
      return m.designation?.toLowerCase().includes('qa') || m.department?.toLowerCase().includes('quality');
    }

    return true;
  });

  const handleSelectAllFiltered = () => {
    const allFilteredSelected = filteredMembers.every(m => selectedEmails.has(m.email));
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredMembers.forEach(m => next.delete(m.email));
      } else {
        filteredMembers.forEach(m => next.add(m.email));
      }
      return next;
    });
  };

  const handleSaveAndConfirm = () => {
    onConfirm(Array.from(selectedEmails));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-xl p-5 sm:p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 z-10 flex flex-col max-h-[88vh] overflow-hidden rounded-2xl sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200/50 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
                    Choose Team Members
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      {selectedEmails.size} selected
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Select registered staff to assign to this workspace project
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="py-3.5 space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search members by name, email, department, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500 transition-all font-semibold text-xs placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter pills + Select All toggle */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'EMPLOYEE', label: 'Team Employees' },
                    { id: 'DEVELOPER', label: 'Developers' },
                    { id: 'QA', label: 'QA' },
                    { id: 'LEAD', label: 'Team Leads' },
                    { id: 'ADMIN', label: 'Admins' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedRoleFilter(f.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                        selectedRoleFilter === f.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {filteredMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[11px] font-bold text-blue-500 hover:text-blue-400 whitespace-nowrap cursor-pointer px-2 py-1 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    {filteredMembers.every(m => selectedEmails.has(m.email))
                      ? 'Deselect Filtered'
                      : 'Select All Filtered'}
                  </button>
                )}
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[46vh] min-h-[180px]">
              {loading ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold">Loading team directory...</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No members matching your search</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search query or role filter</p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedEmails.has(member.email);
                  const roleBadge = getRoleBadge(member.role);
                  const BadgeIcon = roleBadge.icon;

                  return (
                    <div
                      key={member.email}
                      onClick={() => toggleSelect(member.email)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40 shadow-sm'
                          : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Custom Checkbox */}
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                            : 'border-slate-300 dark:border-zinc-700 bg-white/5'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Avatar */}
                        <img
                          src={member.profilePhoto || getAvatarByName(member.name)}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-white/10 flex-shrink-0 shadow-xs"
                        />

                        {/* Name & Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {member.name}
                            </p>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${roleBadge.bg} uppercase tracking-wider`}>
                              <BadgeIcon className="w-2.5 h-2.5" />
                              {roleBadge.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {member.email}
                          </p>
                          {(member.designation || member.department) && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate pt-0.5">
                              {[member.department, member.designation].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="hidden sm:inline-flex text-[10px] font-bold text-blue-500 px-2 py-0.5 rounded-md bg-blue-500/10">
                          Added
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="pt-3 mt-2 border-t border-slate-200/50 dark:border-white/10 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {selectedEmails.size === 0 ? (
                  <span>No members selected</span>
                ) : (
                  <span className="font-bold text-blue-500">
                    {selectedEmails.size} {selectedEmails.size === 1 ? 'member' : 'members'} chosen
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 border border-slate-200/60 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndConfirm}
                  className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Add to Project ({selectedEmails.size})
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
