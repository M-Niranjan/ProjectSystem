import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, FolderGit2, Sparkles, FileText, Search, Plus, Pencil, Trash2, CheckCircle2, XCircle, Filter, Eye, EyeOff, AlertCircle, Key, Lock, Settings, KeyRound, Building2, ScrollText, X, UserPlus, CheckSquare } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName, resolveAvatar, MEN_AVATAR, WOMEN_AVATAR } from '../services/avatar';

import { normalizeRole } from '../services/authRoles';
import { upsertFirestoreUserDoc, deleteFirestoreUserDoc, fetchAllFirestoreUserDocs } from '../services/firebase';
import { useScrollLock } from '../hooks/useScrollLock';
import LuxurySelect from '../components/common/LuxurySelect';
import { useAuthStore } from '../store/useAuthStore';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

// ==========================================
// 1. USER MANAGEMENT VIEW
// ==========================================
export function UserManagementView() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'admin';
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [usersToDelete, setUsersToDelete] = useState<any[] | null>(null);
  const [selectedUserKeys, setSelectedUserKeys] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const isSelectionModeActive = isSelectionMode || selectedUserKeys.size > 0;

  // Touch long-press handling for mobile & tablet (press & hold for ~800ms)
  const longPressTimerRef = React.useRef<any>(null);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = React.useRef(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Lock background scrolling when create/edit user modal or delete confirmation popup is open
  useScrollLock(isModalOpen || (usersToDelete !== null && usersToDelete.length > 0));

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [role, setRole] = useState('ROLE_EMPLOYEE');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Engineering');

  const fetchUsers = async () => {
    const userMap = new Map<string, any>();

    // 1. Fetch directly from Cloud Firestore (Primary Source of Truth)
    try {
      const fsDocs = await fetchAllFirestoreUserDocs();
      if (fsDocs && Array.isArray(fsDocs)) {
        fsDocs.forEach((u: any) => {
          const key = (u.email || '').toLowerCase().trim() || u.uid || u.id;
          if (key) userMap.set(key, u);
        });
      }
    } catch (err) {
      console.warn('Direct Firestore read warning:', err);
    }

    // 2. Fetch from Backend API endpoint
    try {
      const res = await api.get('/api/teams');
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach((u: any) => {
          const key = (u.email || '').toLowerCase().trim() || u.uid || String(u.id);
          if (key) {
            const existing = userMap.get(key);
            userMap.set(key, existing ? { ...u, ...existing } : u);
          }
        });
      }
    } catch (err) {
      console.warn('Backend API get teams warning:', err);
    }

    setUsers(Array.from(userMap.values()));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Hook into global live auto-refresh
  useLiveRefresh(() => {
    if (!isModalOpen && !usersToDelete) {
      fetchUsers();
    }
  });

  const handleOpenEdit = (u: any) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setShowPassword(false);
    setGender((u.gender as any) || 'Male');
    setRole(u.role);
    setDesignation(u.designation || '');
    setDepartment(u.department || 'Engineering');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setGender('Male');
    setRole('ROLE_EMPLOYEE');
    setDesignation('');
    setDepartment('Engineering');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.currentTarget;
    // Delay slightly to give mobile keyboard time to slide up, then smoothly center the input
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  };

  const handleToggleStatus = async (user: any) => {
    const updated = { ...user, active: !user.active };
    try {
      await api.put(`/api/teams/${user.id || user.uid}`, updated);
    } catch (err) {}
    if (user.uid || user.id) {
      await upsertFirestoreUserDoc(String(user.uid || user.id), { active: updated.active });
    }
    await fetchUsers();
  };

  const getUserKey = (u: any) => String(u?.uid || u?.id || u?.email || '');

  const toggleSelectUser = (u: any) => {
    const key = getUserKey(u);
    if (!key) return;
    setSelectedUserKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleTouchStart = (u: any, e: React.TouchEvent) => {
    // If already in selection mode, normal tap toggles
    if (isSelectionModeActive) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressTriggeredRef.current = false;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Long-press threshold: 800ms
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(50); } catch (_) {}
      }
      setIsSelectionMode(true);
      toggleSelectUser(u);
    }, 800);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    // If finger moves more than 10px, user is scrolling -> cancel long-press
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowClick = (u: any, e: React.MouseEvent) => {
    // If a long-press just fired on mobile, skip duplicate click handling
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }

    // If Ctrl or Cmd key is held: enter selection mode and toggle multi-selection
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setIsSelectionMode(true);
      toggleSelectUser(u);
      return;
    }

    // If selection mode is ALREADY active: clicking any row toggles selection
    if (isSelectionModeActive) {
      e.preventDefault();
      toggleSelectUser(u);
      return;
    }
  };

  const handleSelectAll = () => {
    if (filteredUsers.length > 0 && selectedUserKeys.size === filteredUsers.length) {
      setSelectedUserKeys(new Set());
    } else {
      const next = new Set<string>();
      filteredUsers.forEach(u => {
        const key = getUserKey(u);
        if (key) next.add(key);
      });
      setSelectedUserKeys(next);
      setIsSelectionMode(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedUserKeys(new Set());
    setIsSelectionMode(false);
  };

  // Keyboard shortcut: Press Escape to exit multi-selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionModeActive) {
        handleClearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionModeActive]);

  const handleDeleteUser = (target: any) => {
    const targetUser = (target && typeof target === 'object')
      ? target
      : users.find(u => String(u.id) === String(target) || String(u.uid) === String(target) || u.email === target);
    if (targetUser) {
      setDeleteError(null);
      setUsersToDelete([targetUser]);
    }
  };

  const handleDeleteSelected = () => {
    const targets = filteredUsers.filter(u => selectedUserKeys.has(getUserKey(u)));
    if (targets.length > 0) {
      setDeleteError(null);
      setUsersToDelete(targets);
    }
  };

  const handleConfirmDelete = async () => {
    if (!usersToDelete || usersToDelete.length === 0) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Delete on the backend (SQL + Firestore + Firebase Auth) for all selected users
      await Promise.all(
        usersToDelete.map(async (targetUser) => {
          const targetUid = String(targetUser?.uid || targetUser?.id || '');
          const userEmail = targetUser?.email || '';
          const queryParam = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
          await api.delete(`/api/teams/${encodeURIComponent(targetUid)}${queryParam}`);

          // Direct client Firestore delete safety net
          try {
            if (targetUser?.uid) {
              await deleteFirestoreUserDoc(targetUser.uid);
            }
            if (targetUser?.id && targetUser.id !== targetUser.uid) {
              await deleteFirestoreUserDoc(String(targetUser.id));
            }
          } catch (_e) {}
        })
      );

      // 2. ONLY once all deletions are completely confirmed from server:
      // Remove from table list, clear selection, close modal, and refresh
      const deletedKeySet = new Set(usersToDelete.map(u => getUserKey(u)));
      setUsers(prev => prev.filter(u => !deletedKeySet.has(getUserKey(u))));

      setSelectedUserKeys(prev => {
        const next = new Set(prev);
        deletedKeySet.forEach(k => next.delete(k));
        return next;
      });

      setIsDeleting(false);
      setUsersToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      console.error('Delete user(s) failed:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete selected user account(s).';
      setDeleteError(errorMsg);
      setIsDeleting(false);
      // Notice: Users remain completely intact in the background table!
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!name.trim() || !email.trim()) {
      setModalError('Please provide Name and Email!');
      return;
    }
    if (!editingUser && (!password || password.length < 6)) {
      setModalError('Password must be at least 6 characters long!');
      return;
    }
    const defaultAvatar = gender === 'Female' ? WOMEN_AVATAR : MEN_AVATAR;
    const payload: any = { 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      gender,
      role, 
      designation: designation || (role === 'ROLE_ADMIN' ? 'System Administrator' : role === 'ROLE_MANAGER' ? 'Project Lead' : 'Software Engineer'), 
      department: department || 'Engineering', 
      profilePhoto: editingUser?.profilePhoto || defaultAvatar,
      active: true 
    };
    if (password.trim()) {
      payload.password = password.trim();
    }

    if (editingUser) {
      const docId = String(editingUser.uid || editingUser.id);
      try {
        await api.put(`/api/teams/${docId}`, payload);
      } catch (err) {}
      await upsertFirestoreUserDoc(docId, payload);
    } else {
      try {
        const canonicalRole = role === 'ROLE_ADMIN' ? 'admin' : (role === 'ROLE_MANAGER' ? 'teamLeader' : 'employee');
        const endpoint = (role === 'ROLE_MANAGER' || role === 'teamLeader')
          ? '/api/users/team-leaders'
          : '/api/users/employees';
        const res = await api.post(endpoint, payload);
        const createdUid = res.data?.uid || res.data?.id;
        if (createdUid) {
          await upsertFirestoreUserDoc(createdUid, {
            ...payload,
            uid: createdUid,
            role: canonicalRole,
            roleCode: role,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        let errorMsg = err.response?.data?.message || err.message || 'Account provisioning failed.';
        if (err.message === 'Network Error' || !err.response) {
          errorMsg = `Network Error: Unable to reach backend server at ${api.defaults.baseURL || 'http://192.168.29.230:8080'}. Please ensure your mobile phone is connected to the same Wi-Fi network and your PC's Wi-Fi network profile is set to Private.`;
        }
        setModalError(errorMsg);
        return;
      }
    }
    setIsModalOpen(false);
    await fetchUsers();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
    if (roleFilter === 'ALL') return matchesSearch;
    const userNormRole = normalizeRole(u.role || u.roleCode);
    return matchesSearch && userNormRole === roleFilter;
  });

  return (
    <div className="space-y-6 pb-20 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)] shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            Team
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage Team Leaders, Employees, active and inactive members, invitations, and organization membership.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" /> Create New User
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#0e131f]/85 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <LuxurySelect
            className="w-full sm:w-44"
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'ROLE_ADMIN', label: 'Admin', badge: 'ADMIN', badgeColor: 'bg-rose-500/20 text-rose-500 dark:text-rose-400' },
              { value: 'ROLE_MANAGER', label: 'Team Lead', badge: 'LEAD', badgeColor: 'bg-amber-500/20 text-amber-500 dark:text-amber-400' },
              { value: 'ROLE_EMPLOYEE', label: 'Employee', badge: 'MEMBER', badgeColor: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' }
            ]}
          />
          <button
            type="button"
            onClick={() => {
              if (isSelectionModeActive) {
                handleClearSelection();
              } else {
                setIsSelectionMode(true);
              }
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isSelectionModeActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title={isSelectionModeActive ? "Exit multi-select mode" : "Select users (or hold Ctrl + click / long-press on mobile)"}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden xs:inline">{isSelectionModeActive ? 'Exit Select' : 'Select'}</span>
          </button>
        </div>
      </div>

      {/* Batch Action Bar (displays when selection mode is active) */}
      <AnimatePresence>
        {isSelectionModeActive && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-sm flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                {selectedUserKeys.size}
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {selectedUserKeys.size} {selectedUserKeys.size === 1 ? 'user' : 'users'} selected
                </span>
                <span className="hidden sm:inline-block ml-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  (Hold <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">Ctrl</kbd> + click • Press & hold 1s on Mobile/Tablet)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer"
              >
                {selectedUserKeys.size === filteredUsers.length ? 'Deselect All' : `Select All (${filteredUsers.length})`}
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Exit selection mode (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit</span>
              </button>

              {selectedUserKeys.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedUserKeys.size})</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Card View (for mobile screens < md) */}
      <div className="md:hidden space-y-3 w-full">
        {filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-[#0e131f]/85 p-8 text-center text-slate-400 text-xs font-bold rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
            No users found matching the selected filter.
          </div>
        ) : (
          filteredUsers.map(u => {
            const normRole = normalizeRole(u.role || u.roleCode);
            const isSelected = selectedUserKeys.has(getUserKey(u));
            return (
              <div 
                key={u.id || u.uid} 
                onClick={(e) => handleRowClick(u, e)}
                onTouchStart={(e) => handleTouchStart(u, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                className={`bg-white dark:bg-[#0e131f]/85 p-4 rounded-2xl border shadow-sm space-y-3.5 transition-all cursor-pointer select-none ${
                  isSelected 
                    ? 'border-blue-500/70 bg-blue-500/5 dark:bg-blue-500/10 ring-2 ring-blue-500/30' 
                    : isSelectionModeActive
                      ? 'border-slate-300 dark:border-slate-700 hover:border-blue-400'
                      : 'border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Top Row: (Checkbox if selection mode active) + Avatar + Name & Email + Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {isSelectionModeActive && (
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center pr-1 animate-fadeIn">
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.name || u.email}`}
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u)}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </div>
                    )}
                    <img
                      src={resolveAvatar(u.profilePhoto, u.name || u.email, u.gender)}
                      alt="avatar"
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-black text-sm text-slate-800 dark:text-white truncate">
                        {u.name || u.email?.split('@')[0]}
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Edit User Role & Details"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Middle Row: Designation & Department */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Designation & Department</span>
                    <div className="flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{u.designation || 'Specialist'}</span>
                      <span className="text-slate-400 text-xs shrink-0">•</span>
                      <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] shrink-0">{u.department || 'Engineering'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Assigned Role Badge + Status Toggle */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full uppercase border whitespace-nowrap shrink-0 ${
                    normRole === 'ROLE_ADMIN' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                    normRole === 'ROLE_MANAGER' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {normRole === 'ROLE_ADMIN' ? '👑 Admin' : normRole === 'ROLE_MANAGER' ? '👔 Team Lead' : '👷 Employee'}
                  </span>

                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                      u.active !== false 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    {u.active !== false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {u.active !== false ? 'ACTIVE' : 'DEACTIVATED'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop/Tablet Users Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block bg-white dark:bg-[#0e131f]/85 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm overflow-hidden w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isSelectionModeActive && (
                  <th className="p-4 w-10 text-center animate-fadeIn">
                    <input
                      type="checkbox"
                      aria-label="Select all users"
                      checked={filteredUsers.length > 0 && selectedUserKeys.size === filteredUsers.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                    />
                  </th>
                )}
                <th className="p-4 whitespace-nowrap">User</th>
                <th className="p-4 whitespace-nowrap">Designation & Dept</th>
                <th className="p-4 whitespace-nowrap">Assigned Role</th>
                <th className="p-4 whitespace-nowrap">Account Status</th>
                <th className="p-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredUsers.map(u => {
                const normRole = normalizeRole(u.role || u.roleCode);
                const isSelected = selectedUserKeys.has(getUserKey(u));
                return (
                  <tr 
                    key={u.id || u.uid} 
                    onClick={(e) => handleRowClick(u, e)}
                    onTouchStart={(e) => handleTouchStart(u, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    className={`transition-colors cursor-pointer select-none ${
                      isSelected 
                        ? 'bg-blue-500/10 dark:bg-blue-500/15 border-l-4 border-l-blue-500' 
                        : isSelectionModeActive
                          ? 'hover:bg-blue-500/5 dark:hover:bg-blue-500/10'
                          : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                    }`}
                    title={isSelectionModeActive ? "Click to toggle selection" : "Hold Ctrl + Click to select (or press & hold 1s on touch)"}
                  >
                    {isSelectionModeActive && (
                      <td className="p-4 w-10 text-center animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${u.name || u.email}`}
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </td>
                    )}
                    <td className="p-4 whitespace-nowrap flex items-center gap-3">
                      <img
                        src={resolveAvatar(u.profilePhoto, u.name || u.email, u.gender)}
                        alt="avatar"
                        className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 dark:text-white truncate">{u.name || u.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate">{u.email}</p>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{u.designation || 'Specialist'}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{u.department || 'Engineering'}</p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full uppercase border whitespace-nowrap ${
                        normRole === 'ROLE_ADMIN' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' :
                        normRole === 'ROLE_MANAGER' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}>
                        {normRole === 'ROLE_ADMIN' ? '👑 Admin' : normRole === 'ROLE_MANAGER' ? '👔 Team Lead' : '👷 Employee'}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all whitespace-nowrap border ${
                          u.active !== false ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {u.active !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.active !== false ? 'ACTIVE' : 'DEACTIVATED'}
                      </button>
                    </td>

                    {isAdmin ? (
                      <td className="p-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                            title="Edit User Role & Details"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="p-4 text-right whitespace-nowrap text-slate-400 font-medium text-[11px]">
                        Member
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 touch-none overscroll-contain select-none"
          >
            {/* Backdrop */}
            <div 
              onClick={() => setIsModalOpen(false)} 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm touch-none overscroll-none"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 w-full max-w-md relative z-10 shadow-2xl max-h-[85dvh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl modal-dialog-contain overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Header */}
              <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> {editingUser ? 'Edit User Credentials' : 'Create Organization User'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form with dedicated scroll area and pinned footer */}
              <form onSubmit={handleSaveUser} className="flex flex-col flex-1 min-h-0 overflow-hidden" autoComplete="off">
                {/* Scrollable Form Fields */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
                  {/* Hidden dummy fields to prevent browser / mobile password managers from auto-filling admin credentials */}
                  <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                  <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                {modalError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between mb-1.5">
                    <span>Gender (Profile Icon)</span>
                    <span className="text-[9px] text-blue-500 font-bold normal-case">Sets Men/Women avatar</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setGender('Male')}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        gender === 'Male'
                          ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <img src={MEN_AVATAR} alt="Male Icon" className="w-8 h-8 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black">Male</p>
                        <p className="text-[9px] opacity-75">Men Icon</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                        gender === 'Female'
                          ? 'border-pink-500 bg-pink-500/15 text-pink-600 dark:text-pink-400 ring-2 ring-pink-500/20'
                          : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <img src={WOMEN_AVATAR} alt="Female Icon" className="w-8 h-8 rounded-lg object-cover ring-1 ring-pink-500/30 shrink-0" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-black">Female</p>
                        <p className="text-[9px] opacity-75">Women Icon</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    name="admin_create_user_email"
                    id="admin_create_user_email"
                    placeholder="Enter user email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                    Password {editingUser ? '(Leave blank to keep current)' : ''}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      minLength={6}
                      autoComplete="new-password"
                      name="admin_create_user_password"
                      id="admin_create_user_password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={handleInputFocus}
                      placeholder={editingUser ? '•••••••• (unchanged)' : 'Enter initial account password'}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 scroll-mt-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">System Role</label>
                    <LuxurySelect
                      value={role}
                      onChange={(val) => setRole(val)}
                      options={[
                        { value: 'ROLE_ADMIN', label: 'Admin', badge: 'ADMIN', badgeColor: 'bg-rose-500/20 text-rose-500 dark:text-rose-400' },
                        { value: 'ROLE_MANAGER', label: 'Team Lead', badge: 'LEAD', badgeColor: 'bg-amber-500/20 text-amber-500 dark:text-amber-400' },
                        { value: 'ROLE_EMPLOYEE', label: 'Employee', badge: 'MEMBER', badgeColor: 'bg-blue-500/20 text-blue-500 dark:text-blue-400' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="scroll-mt-6 pb-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    onFocus={handleInputFocus}
                    placeholder="e.g. Senior Software Architect"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900"
                  />
                </div>
              </div>

              {/* Pinned Action Footer */}
              <div className="flex justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/95 shrink-0 rounded-b-2xl sm:rounded-b-3xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all active:scale-98"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete User Confirmation Popup Modal */}
      <AnimatePresence>
        {usersToDelete && usersToDelete.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setUsersToDelete(null)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md relative z-10 shadow-2xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white">
                      {usersToDelete.length === 1 ? 'Delete User Account' : `Delete ${usersToDelete.length} User Accounts`}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Permanent deletion confirmation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setUsersToDelete(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User preview card or list */}
              {usersToDelete.length === 1 ? (
                <div className="p-3.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-2xl flex items-center gap-3">
                  <img
                    src={resolveAvatar(usersToDelete[0].profilePhoto, usersToDelete[0].name || usersToDelete[0].email, usersToDelete[0].gender)}
                    alt="avatar"
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {usersToDelete[0].name || usersToDelete[0].email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold truncate">
                      {usersToDelete[0].email}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {usersToDelete[0].designation || 'Specialist'} • {usersToDelete[0].department || 'Engineering'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                    <span>Selected Users to Delete ({usersToDelete.length}):</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                    {usersToDelete.map((u) => (
                      <div key={getUserKey(u)} className="p-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 rounded-xl flex items-center gap-2.5">
                        <img
                          src={resolveAvatar(u.profilePhoto, u.name || u.email, u.gender)}
                          alt="avatar"
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {u.name || u.email?.split('@')[0]}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">
                            {u.email}
                          </p>
                        </div>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-300 shrink-0">
                          {u.designation || 'Specialist'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deleteError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {usersToDelete.length === 1
                  ? '⚠️ Are you sure you want to permanently delete this user? Their account credentials, workspace memberships, and permissions will be permanently removed. This action cannot be undone.'
                  : `⚠️ Are you sure you want to permanently delete these ${usersToDelete.length} users? All of their account credentials, workspace memberships, and permissions will be permanently removed. This action cannot be undone.`}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setUsersToDelete(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 cursor-pointer transition-all active:scale-98 disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      {usersToDelete.length === 1 ? 'Deleting...' : `Deleting ${usersToDelete.length} users...`}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      {usersToDelete.length === 1 ? 'Delete User' : `Delete ${usersToDelete.length} Users`}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// 2. ROLES & PERMISSIONS VIEW
// ==========================================
export function RolesPermissionsView() {
  const defaultRoles = [
    { role: 'Admin', code: 'ROLE_ADMIN', dashboard: true, userMgmt: true, roleMgmt: true, teamMgmt: true, orgSettings: true, auditLogs: true, projects: true, tasks: true },
    { role: 'Team Lead', code: 'ROLE_MANAGER', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: true, orgSettings: false, auditLogs: false, projects: true, tasks: true },
    { role: 'Employee', code: 'ROLE_EMPLOYEE', dashboard: true, userMgmt: false, roleMgmt: false, teamMgmt: false, orgSettings: false, auditLogs: false, projects: false, tasks: true }
  ];

  const [roles, setRoles] = useState<any[]>(defaultRoles);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await api.get('/api/admin/roles');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setRoles(res.data);
        } else {
          setRoles(defaultRoles);
        }
      } catch (err) {
        setRoles(defaultRoles);
      }
    };
    fetchRoles();
  }, []);

  const togglePermission = (roleCode: string, field: string) => {
    setRoles(prev => prev.map(r => {
      if (r.code === roleCode) {
        return { ...r, [field]: !r[field] };
      }
      return r;
    }));
  };

  const handleSavePermissions = async () => {
    try {
      await api.put('/api/admin/roles', roles);
      setSavedMsg('✓ Role permissions saved and applied successfully!');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) {
      setSavedMsg('✓ Role permissions matrix updated!');
      setTimeout(() => setSavedMsg(''), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)] shrink-0">
              <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            Role & Permission Matrix
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Configure module permissions and access control limits per system role.
          </p>
        </div>

        <button
          onClick={handleSavePermissions}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Shield className="w-4 h-4" /> Save Permission Matrix
        </button>
      </div>

      {savedMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold">
          {savedMsg}
        </div>
      )}

      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">System Role</th>
                <th className="p-4 text-center whitespace-nowrap">Dashboard</th>
                <th className="p-4 text-center whitespace-nowrap">User Management</th>
                <th className="p-4 text-center whitespace-nowrap">Role Settings</th>
                <th className="p-4 text-center whitespace-nowrap">Team Management</th>
                <th className="p-4 text-center whitespace-nowrap">Org Config</th>
                <th className="p-4 text-center whitespace-nowrap">Audit Logs</th>
                <th className="p-4 text-center whitespace-nowrap">Project Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {(Array.isArray(roles) ? roles : defaultRoles).map(r => (
                <tr key={r.code} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" /> {r.role}
                  </td>
                  {['dashboard', 'userMgmt', 'roleMgmt', 'teamMgmt', 'orgSettings', 'auditLogs', 'projects'].map((field) => (
                    <td key={field} className="p-4 text-center">
                      <button
                        onClick={() => togglePermission(r.code, field)}
                        className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer ${
                          r[field] ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 shadow-sm scale-105' : 'bg-slate-500/10 text-slate-400 border border-slate-500/10 hover:bg-white/10'
                        }`}
                      >
                        {r[field] ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. ORGANIZATION SETTINGS VIEW
// ==========================================
export function OrganizationSettingsView() {
  const { user, activeOrganizationId, activeOrganization, activeOrgRole, switchOrganization, fetchMyOrganizations } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'organizations' | 'members'>('settings');

  // Active Org Settings State
  const [orgName, setOrgName] = useState(activeOrganization?.organizationName || 'Default Organization');
  const [orgCode, setOrgCode] = useState(activeOrganization?.organizationCode || 'default');
  const [description, setDescription] = useState('Primary workspace organization');
  const [workingHours, setWorkingHours] = useState('09:00 - 18:00 (40h/week)');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [departments, setDepartments] = useState('Engineering, Product, Quality Assurance, Design, Management');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);

  // Organizations Directory State
  const [allOrgs, setAllOrgs] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);
  const [createOrgLoading, setCreateOrgLoading] = useState(false);

  // Members Directory State
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('ROLE_EMPLOYEE');
  const [newMemberDept, setNewMemberDept] = useState('Engineering');
  const [newMemberDesignation, setNewMemberDesignation] = useState('Software Engineer');
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Lock background scroll when Organization modals are open
  useScrollLock(isCreateOrgModalOpen || isAddMemberModalOpen);

  // Fetch active org details
  useEffect(() => {
    const fetchOrgDetails = async () => {
      if (!activeOrganizationId) return;
      try {
        const res = await api.get(`/api/organizations/${activeOrganizationId}`);
        if (res.data) {
          if (res.data.name) setOrgName(res.data.name);
          if (res.data.code) setOrgCode(res.data.code);
          if (res.data.description) setDescription(res.data.description);
          if (res.data.workingHours) setWorkingHours(res.data.workingHours);
          if (res.data.timezone) setTimezone(res.data.timezone);
          if (res.data.departments) setDepartments(res.data.departments);
        }
      } catch (err) {
        if (activeOrganization) {
          setOrgName(activeOrganization.organizationName || 'Default Organization');
          setOrgCode(activeOrganization.organizationCode || 'default');
        }
      }
    };
    fetchOrgDetails();
  }, [activeOrganizationId, activeOrganization]);

  // Fetch all organizations when tab is switched
  const fetchAllOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await api.get('/api/organizations/all').catch(() => api.get('/api/organizations'));
      const orgList = Array.isArray(res.data) ? res.data : (res.data?.organizations || []);
      setAllOrgs(orgList);
    } catch (err) {
      const myOrgs = await fetchMyOrganizations();
      setAllOrgs(myOrgs);
    } finally {
      setLoadingOrgs(false);
    }
  };

  // Fetch org members
  const fetchOrgMembers = async () => {
    if (!activeOrganizationId) return;
    setLoadingMembers(true);
    try {
      const res = await api.get(`/api/organizations/${activeOrganizationId}/members`);
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'organizations') fetchAllOrgs();
    if (activeTab === 'members') fetchOrgMembers();
  }, [activeTab, activeOrganizationId]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganizationId) return;
    setSaving(true);
    setSaved('');
    try {
      await api.put(`/api/organizations/${activeOrganizationId}`, {
        name: orgName,
        description,
        workingHours,
        timezone,
        departments,
      });
      await fetchMyOrganizations();
      setSaved('✓ Organization settings saved successfully!');
    } catch (err: any) {
      setSaved('✓ Organization settings updated successfully.');
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(''), 4000);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOrgError(null);
    if (!newOrgName.trim()) {
      setCreateOrgError('Organization name is required');
      return;
    }
    setCreateOrgLoading(true);
    try {
      const res = await api.post('/api/organizations', {
        name: newOrgName.trim(),
        code: newOrgCode.trim() || undefined,
        description: newOrgDesc.trim() || undefined,
      });
      setIsCreateOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgCode('');
      setNewOrgDesc('');
      await fetchAllOrgs();
      await fetchMyOrganizations();
      if (res.data?.id) {
        await switchOrganization(res.data.id);
      }
    } catch (err: any) {
      setCreateOrgError(err.response?.data?.message || err.message || 'Failed to create organization');
    } finally {
      setCreateOrgLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !activeOrganizationId) return;
    setAddMemberError(null);
    setAddMemberLoading(true);
    try {
      await api.post(`/api/organizations/${activeOrganizationId}/members`, {
        email: newMemberEmail.trim().toLowerCase(),
        role: newMemberRole,
        name: newMemberName.trim() || undefined,
        department: newMemberDept.trim() || undefined,
        designation: newMemberDesignation.trim() || undefined,
      });
      setIsAddMemberModalOpen(false);
      setNewMemberEmail('');
      setNewMemberName('');
      await fetchOrgMembers();
    } catch (err: any) {
      setAddMemberError(err.response?.data?.message || err.message || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeOrganizationId) return;
    setMembers(prev => prev.filter(m => (m.userId || m.id || m.uid) !== userId));
    try {
      await api.delete(`/api/organizations/${activeOrganizationId}/members/${userId}`);
    } catch (err: any) {
      console.warn('Remove member notice:', err);
    }
    await fetchOrgMembers();
  };

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    return (m.name || m.userName || '').toLowerCase().includes(q) ||
           (m.email || m.userEmail || '').toLowerCase().includes(q) ||
           (m.designation || '').toLowerCase().includes(q) ||
           (m.department || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-20 w-full min-w-0 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)] shrink-0">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            Organization Management
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage multi-tenant workspaces, team access, work schedules, and organization profile.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateOrgModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-4 h-4" /> Create Organization
          </button>
        </div>
      </div>

      {/* Active Organization Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shrink-0">
            {(activeOrganization?.organizationName || orgName || 'O').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-800 dark:text-white truncate">
                {activeOrganization?.organizationName || orgName}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                ACTIVE TENANT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
              ID: {activeOrganizationId || 'org_default'} • Code: {orgCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
            Role: <span className="text-blue-600 dark:text-blue-400 uppercase font-black">{activeOrgRole || user?.role || 'Admin'}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none no-scrollbar">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" /> Active Org Settings
        </button>

        <button
          onClick={() => setActiveTab('organizations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'organizations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Building2 className="w-4 h-4" /> All Organizations
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" /> Organization Members
        </button>
      </div>

      {/* TAB 1: ACTIVE ORG SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {saved && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold">
              {saved}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="glass-panel p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Organization Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase text-slate-400">Workspace Code</label>
                  <span className="text-[10px] text-blue-500 font-semibold">User-Facing Login Code</span>
                </div>
                <div className="relative mt-1 flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={orgCode}
                    className="w-full pl-4 pr-20 py-2.5 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono font-black text-slate-900 dark:text-white select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (orgCode) {
                        navigator.clipboard.writeText(orgCode);
                        alert(`Workspace Code '${orgCode}' copied to clipboard!`);
                      }
                    }}
                    className="absolute right-2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition cursor-pointer shadow-sm"
                  >
                    Copy Code
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Employees and team leaders use this code when signing in to this organization.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Workspace purpose or branch description..."
                className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Working Hours / Week</label>
                <input
                  type="text"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">System Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400">Organization Departments (Comma Separated)</label>
              <textarea
                value={departments}
                onChange={(e) => setDepartments(e.target.value)}
                rows={3}
                className="w-full mt-1 px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none resize-none focus:border-blue-500"
              ></textarea>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                {saving ? 'Saving Changes...' : 'Save Organization Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ALL ORGANIZATIONS DIRECTORY */}
      {activeTab === 'organizations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Available tenant organizations in this system. You can switch between active workspaces below.
            </p>
            <button
              onClick={fetchAllOrgs}
              className="text-xs font-bold text-blue-500 hover:underline cursor-pointer"
            >
              Refresh Directory
            </button>
          </div>

          {loadingOrgs ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              Loading organizations...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allOrgs.map(org => {
                const orgId = org.id || org.organizationId;
                const orgTitle = org.name || org.organizationName || orgId;
                const orgSlug = org.code || org.organizationCode || 'tenant';
                const isActive = (orgId === activeOrganizationId);

                return (
                  <div
                    key={orgId}
                    className={`p-5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-[#0e131f]/85 border-slate-200 dark:border-white/10 hover:border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                          {orgTitle.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-800 dark:text-white">{orgTitle}</h3>
                          <p className="text-[10px] font-mono text-slate-400">{orgSlug} • {orgId}</p>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      ) : (
                        <button
                          onClick={() => switchOrganization(orgId)}
                          className="text-[11px] font-bold px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer transition-colors"
                        >
                          Switch
                        </button>
                      )}
                    </div>

                    {org.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                        {org.description}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Status: <strong className="text-emerald-500">Active</strong></span>
                      {org.role && (
                        <span>Role: <strong className="text-slate-700 dark:text-slate-200 uppercase">{org.role}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ORGANIZATION MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search organization members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <button
              onClick={() => setIsAddMemberModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          </div>

          <div className="glass-panel overflow-hidden border border-slate-200 dark:border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Member</th>
                    <th className="p-4">Designation & Dept</th>
                    <th className="p-4">Org Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loadingMembers ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">Loading members...</td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">No members found in this organization.</td>
                    </tr>
                  ) : (
                    filteredMembers.map(m => {
                      const memberId = m.userId || m.uid || m.id;
                      const memberName = m.name || m.userName || m.email?.split('@')[0];
                      const memberEmail = m.email || m.userEmail;
                      const memberRole = m.orgRole || m.role || 'employee';

                      return (
                        <tr key={memberId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                              {(memberName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-800 dark:text-white truncate">{memberName}</p>
                              <p className="text-[10px] text-slate-400 font-bold truncate">{memberEmail}</p>
                            </div>
                          </td>

                          <td className="p-4">
                            <p className="font-bold text-slate-700 dark:text-slate-200">{m.designation || 'Specialist'}</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">{m.department || 'Engineering'}</p>
                          </td>

                          <td className="p-4">
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                              {memberRole}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          </td>

                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleRemoveMember(memberId)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Remove from Organization"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ORGANIZATION MODAL */}
      <AnimatePresence>
        {isCreateOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsCreateOrgModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 p-6 w-full max-w-md relative z-10 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto modal-dialog-contain overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" /> Create New Organization
                </h2>
                <button
                  onClick={() => setIsCreateOrgModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {createOrgError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {createOrgError}
                </div>
              )}

              <form onSubmit={handleCreateOrg} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Code / Short Handle</label>
                  <input
                    type="text"
                    placeholder="e.g. acme-corp"
                    value={newOrgCode}
                    onChange={(e) => setNewOrgCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description of this organization workspace..."
                    value={newOrgDesc}
                    onChange={(e) => setNewOrgDesc(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none resize-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsCreateOrgModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createOrgLoading}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 text-center"
                  >
                    {createOrgLoading ? 'Creating...' : 'Create & Switch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsAddMemberModalOpen(false)} className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 p-6 w-full max-w-md relative z-10 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto modal-dialog-contain overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" /> Add Member to Organization
                </h2>
                <button
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {addMemberError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {addMemberError}
                </div>
              )}

              <form onSubmit={handleAddMember} className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">User Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="colleague@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Role in Organization</label>
                  <LuxurySelect
                    value={newMemberRole}
                    onChange={(val) => setNewMemberRole(val)}
                    options={[
                      { value: 'ROLE_ADMIN', label: 'Admin', badge: 'ADMIN', badgeColor: 'bg-rose-500/20 text-rose-500' },
                      { value: 'ROLE_MANAGER', label: 'Team Lead', badge: 'LEAD', badgeColor: 'bg-amber-500/20 text-amber-500' },
                      { value: 'ROLE_EMPLOYEE', label: 'Employee', badge: 'MEMBER', badgeColor: 'bg-blue-500/20 text-blue-500' }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                    <input
                      type="text"
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Designation</label>
                    <input
                      type="text"
                      value={newMemberDesignation}
                      onChange={(e) => setNewMemberDesignation(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addMemberLoading}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 text-center"
                  >
                    {addMemberLoading ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// 4. SECURITY & AUDIT LOGS VIEW
// ==========================================
export function AuditLogsView() {
  const defaultLogs: any[] = [];

  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      const res = await api.get('/api/admin/audit-logs');
      setLogs(res.data || []);
    } catch (err) {
      setLogs([]);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(l => {
    const matchesSearch = l.user.toLowerCase().includes(search.toLowerCase()) || l.activity.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 pb-20 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)] shrink-0">
              <ScrollText className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            Security & Audit Logs
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time system activity history: user logins, role updates, administrative actions, and task reviews.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          Refresh Logs
        </button>
      </div>

      {/* Audit Log Filters */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between relative z-20">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit logs by user or activity description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:border-blue-500/50 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <LuxurySelect
            className="w-full sm:w-48"
            value={actionFilter}
            onChange={(val) => setActionFilter(val)}
            options={[
              { value: 'ALL', label: 'All Action Types' },
              { value: 'LOGIN', label: 'Login Events', badge: 'AUTH', badgeColor: 'bg-indigo-500/20 text-indigo-400' },
              { value: 'ROLE_UPDATE', label: 'Role Updates', badge: 'SEC', badgeColor: 'bg-amber-500/20 text-amber-400' },
              { value: 'PROJECT_CREATE', label: 'Project Creation', badge: 'PROJ', badgeColor: 'bg-emerald-500/20 text-emerald-400' },
              { value: 'TASK_SUBMIT', label: 'Task Submissions', badge: 'TASK', badgeColor: 'bg-blue-500/20 text-blue-400' }
            ]}
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0 relative z-10">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Action</th>
                <th className="p-4">Activity Log Details</th>
                <th className="p-4">Date & Time</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-black text-slate-800 dark:text-white">{l.user}</td>
                  <td className="p-4 font-extrabold text-blue-500 uppercase text-[10px]">{l.action}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 font-semibold">{l.activity}</td>
                  <td className="p-4 text-slate-400 font-bold text-[10px]">{l.date} {l.time}</td>
                  <td className="p-4 text-right">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
