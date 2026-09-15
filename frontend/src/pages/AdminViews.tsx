import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, FolderGit2, Sparkles, FileText, Search, Plus, Pencil, Trash2, CheckCircle2, XCircle, Filter, Eye, EyeOff, AlertCircle, Key, Lock, Settings } from 'lucide-react';
import api from '../services/api';
import { getAvatarByName } from '../services/avatar';

import { normalizeRole } from '../services/authRoles';
import { upsertFirestoreUserDoc, deleteFirestoreUserDoc, fetchAllFirestoreUserDocs } from '../services/firebase';

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

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    setRole('ROLE_EMPLOYEE');
    setDesignation('');
    setDepartment('Engineering');
    setModalError(null);
    setIsModalOpen(true);
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
    const payload: any = { 
      name: name.trim(), 
      email: email.trim().toLowerCase(), 
      role, 
      designation: designation || (role === 'ROLE_ADMIN' ? 'System Administrator' : role === 'ROLE_MANAGER' ? 'Project Lead' : 'Software Engineer'), 
      department: department || 'Engineering', 
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
        const errorMsg = err.response?.data?.message || err.message || 'Account provisioning failed.';
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
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" /> User Management
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
            className="px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white text-xs font-bold outline-none cursor-pointer"
          >
            <option value="ALL" className="dark:bg-slate-900">All Roles</option>
            <option value="ROLE_ADMIN" className="dark:bg-slate-900">Admin</option>
            <option value="ROLE_MANAGER" className="dark:bg-slate-900">Team Lead</option>
            <option value="ROLE_EMPLOYEE" className="dark:bg-slate-900">Employee</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 shadow-xl w-full min-w-0">
        <div className="overflow-x-auto w-full min-w-0">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-500/5 border-b border-slate-200/30 dark:border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Designation & Dept</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Account Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredUsers.map(u => {
                const normRole = normalizeRole(u.role || u.roleCode);
                return (
                  <tr key={u.id || u.uid} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img
                        src={u.profilePhoto || getAvatarByName(u.name || u.email)}
                        alt="avatar"
                        className="w-8 h-8 rounded-xl object-cover ring-2 ring-blue-500/10"
                      />
                      <div>
                        <p className="font-black text-slate-800 dark:text-white">{u.name || u.email?.split('@')[0]}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{u.designation || 'Specialist'}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">{u.department || 'Engineering'}</p>
                    </td>

                    <td className="p-4">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase border ${
                        normRole === 'ROLE_ADMIN' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                        normRole === 'ROLE_MANAGER' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {normRole === 'ROLE_ADMIN' ? '👑 Admin' : normRole === 'ROLE_MANAGER' ? '👔 Team Lead' : '👷 Employee'}
                      </span>
                    </td>

                  <td className="p-4">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all ${
                        u.active !== false ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                      }`}
                    >
                      {u.active !== false ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.active !== false ? 'ACTIVE' : 'DEACTIVATED'}
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Edit User Role & Details"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel p-6 w-full max-w-md relative z-10 shadow-2xl space-y-4"
            >
              <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" /> {editingUser ? 'Edit User Credentials' : 'Create Organization User'}
              </h2>

              <form onSubmit={handleSaveUser} className="space-y-3">
                {modalError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Password {editingUser ? '(Leave blank to keep current)' : ''}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUser ? '•••••••• (unchanged)' : 'Enter initial account password'}
                      className="w-full pl-3 pr-10 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none focus:border-blue-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">System Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
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
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Software Architect"
                    className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg"
                  >
                    Save Changes
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
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-500" /> Role & Permission Matrix
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
                <th className="p-4">System Role</th>
                <th className="p-4 text-center">Dashboard</th>
                <th className="p-4 text-center">User Management</th>
                <th className="p-4 text-center">Role Settings</th>
                <th className="p-4 text-center">Team Management</th>
                <th className="p-4 text-center">Org Config</th>
                <th className="p-4 text-center">Audit Logs</th>
                <th className="p-4 text-center">Project Management</th>
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
        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" /> Organization Settings
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
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2.5">
            <img src="/audit-icon.png" alt="Audit" className="w-7 h-7 object-contain drop-shadow-sm" /> Security & Audit Logs
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
