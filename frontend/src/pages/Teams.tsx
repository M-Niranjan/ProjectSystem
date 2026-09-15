import { getAvatarByName } from '../services/avatar';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserCheck, Shield, Mail, Plus, X, Globe, Briefcase, Award, Eye, EyeOff, Pencil, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { upsertFirestoreUserDoc, fetchAllFirestoreUserDocs } from '../services/firebase';

interface TeamMember {
  id: number | string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: string;
  experience?: number;
  skills?: string;
  profilePhoto?: string;
  capacityHours?: number; // Capacity per week (default 40h)
  allocatedPercent?: number; // Calculated total workload %
}

export default function Teams() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberWorkloads, setMemberWorkloads] = useState<{ [key: string]: number }>({});
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteRole, setInviteRole] = useState('ROLE_EMPLOYEE');
  const [inviteDesignation, setInviteDesignation] = useState('');
  const [inviteDept, setInviteDept] = useState('Technology');
  const [inviteExp, setInviteExp] = useState(2);
  const [inviteSkills, setInviteSkills] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Teammate View details modal state
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // Profile image camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Default Mock Team
  const mockTeam: TeamMember[] = [];

  const fetchMembers = async () => {
    let teamList: any[] = [];
    try {
      const res = await api.get('/api/teams');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        teamList = res.data;
      }
    } catch (err) {
      console.warn('Backend get teams failed in Teams.tsx, trying Cloud Firestore direct:', err);
    }

    if (teamList.length === 0) {
      teamList = await fetchAllFirestoreUserDocs();
    }

    setMembers(teamList);

    // Compute total task allocation % for each team member
    try {
      const tasksRes = await api.get('/api/tasks');
      const allTasks = tasksRes.data || [];
      const workloads: { [key: string]: number } = {};

      teamList.forEach((m: any) => {
        let totalAlloc = 0;
        allTasks.forEach((t: any) => {
          if (t.assignee && (t.assignee.id === m.id || t.assignee.uid === m.uid || t.assignee.name === m.name)) {
            if (t.status !== 'COMPLETED') {
              totalAlloc += (t.allocationPercent || 50);
            }
          }
        });
        workloads[m.id || m.uid] = totalAlloc;
      });

      setMemberWorkloads(workloads);
    } catch (err) {
      setMemberWorkloads({});
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenEdit = (member: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditMode(true);
    setEditingMember(member);
    setInviteName(member.name);
    setInviteEmail(member.email);
    setInvitePassword('');
    setShowInvitePassword(false);
    setInviteRole(member.role);
    setInviteDesignation(member.designation || '');
    setInviteDept(member.department || 'Technology');
    setInviteExp(member.experience || 2);
    setInviteSkills(member.skills || '');
    setProfilePhoto(member.profilePhoto || '');
    setIsInviteOpen(true);
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingMember(null);
    setInviteName('');
    setInviteEmail('');
    setInvitePassword('');
    setShowInvitePassword(false);
    setInviteRole('ROLE_EMPLOYEE');
    setInviteDesignation('');
    setInviteDept('Technology');
    setInviteExp(2);
    setInviteSkills('');
    setProfilePhoto('');
    setIsInviteOpen(true);
  };

  const handleOpenView = (member: TeamMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setViewingMember(member);
    setIsViewOpen(true);
  };

  // Profile image handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play failed", e));
        }
      }, 100);
    } catch (err) {
      alert("Unable to access camera. Please check device permissions.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 150, 150);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setProfilePhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const [modalError, setModalError] = useState<string | null>(null);

  const closeInviteModal = () => {
    stopCamera();
    setModalError(null);
    setIsInviteOpen(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!inviteEmail.trim() || !inviteName.trim()) return;
    if (!isEditMode && (!invitePassword || invitePassword.length < 6)) {
      setModalError('Password must be at least 6 characters long!');
      return;
    }

    const payload: any = {
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      designation: inviteDesignation || 'Teammate',
      department: inviteDept,
      experience: Number(inviteExp),
      skills: inviteSkills,
      profilePhoto: profilePhoto || undefined
    };
    if (invitePassword.trim()) {
      payload.password = invitePassword.trim();
    }

    if (isEditMode && editingMember) {
      const docId = String((editingMember as any).uid || editingMember.id);
      try {
        await api.put(`/api/teams/${docId}`, payload);
      } catch (err) {}
      await upsertFirestoreUserDoc(docId, payload);
    } else {
      try {
        const canonicalRole = inviteRole === 'ROLE_ADMIN' ? 'admin' : (inviteRole === 'ROLE_MANAGER' ? 'teamLeader' : 'employee');
        const endpoint = (inviteRole === 'ROLE_MANAGER' || inviteRole === 'teamLeader')
          ? '/api/users/team-leaders'
          : '/api/users/employees';
        const res = await api.post(endpoint, payload);
        const createdUid = res.data?.uid || res.data?.id;
        if (createdUid) {
          await upsertFirestoreUserDoc(createdUid, {
            ...payload,
            uid: createdUid,
            role: canonicalRole,
            roleCode: inviteRole,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message || 'Account provisioning failed.';
        setModalError(errorMsg);
        return;
      }
    }
    closeInviteModal();
    await fetchMembers();
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            Team Hub
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Manage organization members, assign roles, and review designations.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 cursor-pointer transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" /> Invite Teammate
        </button>
      </div>

      {/* Members Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(member => (
          <div key={member.id} className="glass-panel p-6 flex flex-col justify-between min-h-[220px] relative group">
            {/* Hover card action icons overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={(e) => handleOpenView(member, e)}
                className="p-1 rounded-lg hover:bg-white/15 text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                title="View Teammate Details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => handleOpenEdit(member, e)}
                className="p-1 rounded-lg hover:bg-white/15 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                title="Edit Teammate"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                <img
                  src={member.profilePhoto || getAvatarByName(member.name)}
                  alt="Avatar"
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500/10"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
              </div>
              <div className="min-w-0 pr-12">
                <h3 className="text-sm font-black text-slate-800 dark:text-white truncate">{member.name}</h3>
                <p className="text-[10px] font-bold text-blue-500 mt-0.5 truncate">{member.designation || 'Software Engineer'}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider truncate">{member.department || 'Engineering'}</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-200/30 dark:border-white/5 pt-4">
              {/* PDF Spec: Resource Capacity & Workload Allocation Bar */}
              {(() => {
                const workloadPercent = memberWorkloads[member.id] || 0;
                const isOverallocated = workloadPercent > 100;
                const capacityHours = Math.round((workloadPercent / 100) * 40);

                return (
                  <div className="space-y-1 bg-white/5 p-2.5 rounded-xl border border-slate-200/40 dark:border-white/5">
                    <div className="flex justify-between items-center text-[10px] font-black">
                      <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        ⚡ Workload Allocation
                      </span>
                      <span className={isOverallocated ? 'text-red-500 font-extrabold animate-pulse' : 'text-slate-700 dark:text-slate-200'}>
                        {workloadPercent}% {isOverallocated ? '⚠️ Overbooked' : `(${capacityHours}h/40h)`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/40 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverallocated
                            ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-md shadow-red-500/30'
                            : workloadPercent > 70
                            ? 'bg-gradient-to-r from-blue-500 to-amber-500'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, workloadPercent)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 truncate pr-2">
                  <Mail className="w-3.5 h-3.5" /> {member.email}
                </span>
                
                <span className="flex items-center gap-1 flex-shrink-0">
                  <Shield className="w-3.5 h-3.5 text-blue-500" /> {member.role.replace('ROLE_', '')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite / Edit Teammate Modal */}
      <AnimatePresence>
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeInviteModal}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel w-full max-w-sm p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={closeInviteModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-md font-black text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-500" /> {isEditMode ? 'Edit Teammate Profile' : 'Invite Organization Teammate'}
              </h2>

              <form onSubmit={handleInvite} className="space-y-4">
                {modalError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}
                {/* Profile Photo selector & Camera capture */}
                <div className="flex flex-col items-center space-y-3 p-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                  <div className="relative">
                    {isCameraActive ? (
                      <video 
                        ref={videoRef} 
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500 bg-black"
                        playsInline
                        muted
                      />
                    ) : (
                      <img
                        src={profilePhoto || getAvatarByName(inviteName || 'seed')}
                        alt="Teammate avatar preview"
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-blue-500/10"
                      />
                    )}
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    <input 
                      type="file" 
                      id="fileInput" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                    <label 
                      htmlFor="fileInput"
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      Choose Photo
                    </label>

                    {isCameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-slate-200/50 dark:border-white/5 text-[10px] font-black text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                      >
                        Use Camera
                      </button>
                    )}

                    {profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setProfilePhoto('')}
                        className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/15 text-[10px] font-black rounded-lg cursor-pointer transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Password {isEditMode ? '(Leave blank to keep current)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type={showInvitePassword ? 'text' : 'password'}
                      required={!isEditMode}
                      minLength={6}
                      placeholder={isEditMode ? '•••••••• (unchanged)' : 'Enter initial account password'}
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowInvitePassword(!showInvitePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      title={showInvitePassword ? "Hide password" : "Show password"}
                    >
                      {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Designer"
                      value={inviteDesignation}
                      onChange={(e) => setInviteDesignation(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</label>
                    <select
                      value={inviteDept}
                      onChange={(e) => setInviteDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                    >
                      <option className="dark:bg-slate-800" value="Technology">Technology</option>
                      <option className="dark:bg-slate-800" value="Product Design">Product Design</option>
                      <option className="dark:bg-slate-800" value="Marketing">Marketing</option>
                      <option className="dark:bg-slate-800" value="Sales">Sales</option>
                      <option className="dark:bg-slate-800" value="Operations">Operations</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Security Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs cursor-pointer appearance-none"
                    >
                      <option className="dark:bg-slate-800" value="ROLE_EMPLOYEE">Employee</option>
                      <option className="dark:bg-slate-800" value="ROLE_MANAGER">Manager</option>
                      <option className="dark:bg-slate-800" value="ROLE_ADMIN">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Experience (Yrs)</label>
                    <input
                      type="number"
                      value={inviteExp}
                      onChange={(e) => setInviteExp(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Competencies (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. React, Node, CSS"
                    value={inviteSkills}
                    onChange={(e) => setInviteSkills(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 mt-6">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="px-4 py-2 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-500 dark:text-slate-400 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-blue-500/10 transition-colors"
                  >
                    {isEditMode ? 'Save Profile Changes' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Teammate Details Modal */}
      <AnimatePresence>
        {isViewOpen && viewingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsViewOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel w-full max-w-sm p-6 shadow-2xl relative border border-slate-200/50 dark:border-white/10 text-center space-y-6"
            >
              <button
                onClick={() => setIsViewOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <img
                    src={viewingMember.profilePhoto || getAvatarByName(viewingMember.name)}
                    alt="avatar"
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-blue-500/20"
                  />
                  <span className="absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full bg-green-500 border-4 border-slate-200 dark:border-slate-900 animate-pulse"></span>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">{viewingMember.name}</h3>
                  <p className="text-xs font-bold text-blue-500 mt-0.5">{viewingMember.designation || 'Software Engineer'}</p>
                </div>
              </div>

              <div className="space-y-3 text-left text-xs font-bold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-200/30 dark:border-white/5 pb-2">
                  <span className="text-slate-400">Department</span>
                  <span>{viewingMember.department || 'Technology'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 dark:border-white/5 pb-2">
                  <span className="text-slate-400">Email Contact</span>
                  <span className="text-slate-800 dark:text-white select-text cursor-text">{viewingMember.email}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/30 dark:border-white/5 pb-2">
                  <span className="text-slate-400">Role level</span>
                  <span className="text-blue-500">{viewingMember.role.replace('ROLE_', '')}</span>
                </div>
                {viewingMember.experience !== undefined && (
                  <div className="flex justify-between border-b border-slate-200/30 dark:border-white/5 pb-2">
                    <span className="text-slate-400">Experience</span>
                    <span>{viewingMember.experience} Years</span>
                  </div>
                )}
                {viewingMember.skills && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Competencies</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingMember.skills.split(',').map(s => (
                        <span key={s} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-black border border-blue-500/15">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
