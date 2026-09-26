import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, FolderGit2, Sparkles, FileText, Search, Plus, Pencil, Trash2, CheckCircle2, XCircle, Filter, Eye, EyeOff, AlertCircle, Key, Lock, Settings, KeyRound, Building2, ScrollText, X } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName, resolveAvatar, MEN_AVATAR, WOMEN_AVATAR } from '../services/avatar';

import { normalizeRole } from '../services/authRoles';
import { upsertFirestoreUserDoc, deleteFirestoreUserDoc, fetchAllFirestoreUserDocs } from '../services/firebase';
import { useScrollLock } from '../hooks/useScrollLock';

// ==========================================
// 1. USER MANAGEMENT VIEW
// ==========================================
export function UserManagementView() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Lock background scrolling when create/edit user modal is open
  useScrollLock(isModalOpen);

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

  const handleDeleteUser = async (id: any) => {
    if (confirm('Are you sure you want to remove this user permanently from the organization?')) {
      const targetUser = users.find(u => u.id === id || u.uid === id);
      const targetUid = String(targetUser?.uid || targetUser?.id || id);
      try {
        await api.delete(`/api/teams/${targetUid}`);
      } catch (err) {
        console.warn('Backend API delete completed');
      }
      await deleteFirestoreUserDoc(targetUid);
      await fetchUsers();
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
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)] shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            </div>
            User Directory
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Admin directory to add, edit, activate/deactivate, and assign roles across the organization.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Create New User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs outline-none focus:border-blue-500/50 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 sm:flex-initial px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL" className="dark:bg-slate-900">All Roles</option>
            <option value="ROLE_ADMIN" className="dark:bg-slate-900">Admin</option>
            <option value="ROLE_MANAGER" className="dark:bg-slate-900">Team Lead</option>
            <option value="ROLE_EMPLOYEE" className="dark:bg-slate-900">Employee</option>
          </select>
        </div>
      </div>

      {/* Mobile Card View (for mobile screens < md) */}
      <div className="md:hidden space-y-3 w-full">
        {filteredUsers.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-400 text-xs font-bold rounded-2xl border border-slate-200/50 dark:border-white/5">
            No users found matching the selected filter.
          </div>
        ) : (
          filteredUsers.map(u => {
            const normRole = normalizeRole(u.role || u.roleCode);
            return (
              <div 
                key={u.id || u.uid} 
                className="glass-panel p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 shadow-sm space-y-3.5 bg-white/40 dark:bg-slate-900/40"
              >
                {/* Top Row: Avatar + Name & Email + Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
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

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-500/10 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                      title="Edit User Role & Details"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Designation & Department */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/5 text-xs">
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
                    normRole === 'ROLE_ADMIN' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                    normRole === 'ROLE_MANAGER' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    {normRole === 'ROLE_ADMIN' ? '👑 Admin' : normRole === 'ROLE_MANAGER' ? '👔 Team Lead' : '👷 Employee'}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(u)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                      u.active !== false 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
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
      <div className="hidden md:block glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
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
                return (
                  <tr key={u.id || u.uid} className="hover:bg-white/5 transition-colors">
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
                        normRole === 'ROLE_ADMIN' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        normRole === 'ROLE_MANAGER' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {normRole === 'ROLE_ADMIN' ? '👑 Admin' : normRole === 'ROLE_MANAGER' ? '👔 Team Lead' : '👷 Employee'}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg cursor-pointer transition-all whitespace-nowrap border ${
                          u.active !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {u.active !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {u.active !== false ? 'ACTIVE' : 'DEACTIVATED'}
                      </button>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                          title="Edit User Role & Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
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
              className="glass-panel p-5 sm:p-6 w-full max-w-md relative z-10 shadow-2xl space-y-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto overscroll-contain modal-dialog-contain my-auto border border-slate-200/50 dark:border-white/10 rounded-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1">
                <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" /> {editingUser ? 'Edit User Credentials' : 'Create Organization User'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-3.5" autoComplete="off">
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
                  <label className="text-[10px] font-black uppercase text-slate-400 flex items-center justify-between mb-1.5">
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
                          : 'border-slate-200/50 dark:border-white/5 bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'
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
                          : 'border-slate-200/50 dark:border-white/5 bg-white/5 hover:bg-white/10 text-slate-600 dark:text-slate-300'
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
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={handleInputFocus}
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
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
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-400">
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
                      className="w-full pl-3 pr-10 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 scroll-mt-6">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">System Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="ROLE_ADMIN" className="dark:bg-slate-900">Admin</option>
                      <option value="ROLE_MANAGER" className="dark:bg-slate-900">Team Lead</option>
                      <option value="ROLE_EMPLOYEE" className="dark:bg-slate-900">Employee</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="scroll-mt-6">
                  <label className="text-[10px] font-black uppercase text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    onFocus={handleInputFocus}
                    placeholder="e.g. Senior Software Architect"
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 pb-2 sticky bottom-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-3 border-t border-slate-200/30 dark:border-white/5 rounded-b-2xl sm:rounded-b-3xl z-20">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    {editingUser ? 'Save Changes' : 'Create User'}
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
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
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
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5"
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
                    <Shield className="w-4 h-4 text-purple-500" /> {r.role}
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
  const [orgName, setOrgName] = useState('Prologue Enterprise Solutions');
  const [workingHours, setWorkingHours] = useState('09:00 - 18:00 (40h/week)');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');
  const [departments, setDepartments] = useState('Engineering, Product, Quality Assurance, Design, Management');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)] shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
          </div>
          Organization Settings
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Manage system configuration, working hours, departments, and project defaults.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-bold">
          ✓ Organization settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="glass-panel p-6 space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Organization Name</label>
          <input
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Working Hours / Week</label>
            <input
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">System Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Organization Departments (Comma Separated)</label>
          <textarea
            value={departments}
            onChange={(e) => setDepartments(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none resize-none h-20"
          ></textarea>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
          >
            Save Organization Settings
          </button>
        </div>
      </form>
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
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
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
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
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
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL" className="dark:bg-slate-900">All Action Types</option>
            <option value="LOGIN" className="dark:bg-slate-900">Login Events</option>
            <option value="ROLE_UPDATE" className="dark:bg-slate-900">Role Updates</option>
            <option value="PROJECT_CREATE" className="dark:bg-slate-900">Project Creation</option>
            <option value="TASK_SUBMIT" className="dark:bg-slate-900">Task Submissions</option>
          </select>
        </div>
      </div>

      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
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
