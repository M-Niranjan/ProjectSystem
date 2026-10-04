import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Lock,
  Camera,
  Check,
  Save,
  ArrowLeft,
  MoreVertical,
  Sun,
  Moon,
  Shield,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  IdCard,
  Laptop,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Award
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore, ThemeMode } from '../store/useUIStore';
import { formatRoleName, normalizeRole } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

type ProfileTab = 'info' | 'security' | 'preferences';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, activeOrganization } = useAuthStore();
  const { darkMode, toggleTheme, themeMode, setThemeMode, showToast } = useUIStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const role = normalizeRole(user?.role);
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER';

  // Active Tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form Fields
  const [name, setName] = useState(user?.name || 'Niranjan S M');
  const [email, setEmail] = useState(user?.email || 'niranjan.sm@example.com');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [department, setDepartment] = useState(user?.department || 'Development');
  const [designation, setDesignation] = useState(
    user?.designation || (isTeamLead ? 'Team Lead' : isAdmin ? 'System Administrator' : 'Software Developer')
  );
  const [photoUrl, setPhotoUrl] = useState<string>(user?.profilePhoto || '');

  // Read-only / Locked fields
  const employeeId = user?.employeeId || `EMP-${String(user?.id || 124).padStart(5, '0')}`;
  const joiningDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '15 Aug 2024';

  // Security Tab States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // Preferences Tab States
  const [defaultDashboard, setDefaultDashboard] = useState('Overview');
  const [language, setLanguage] = useState('English (US)');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('12-hour (AM/PM)');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata (+5:30)');

  // Active Sessions
  const [sessions, setSessions] = useState([
    {
      id: 'sess-1',
      device: 'Chrome on Windows 11',
      type: 'desktop',
      ip: '192.168.1.45',
      lastActive: 'Active Now',
      isCurrent: true,
    },
    {
      id: 'sess-2',
      device: 'Android 14 (Pixel 8)',
      type: 'mobile',
      ip: '166.137.8.12',
      lastActive: '2 hours ago',
      isCurrent: false,
    },
  ]);

  // Sync user state on load
  useEffect(() => {
    if (user) {
      setName(user.name || 'Niranjan S M');
      setEmail(user.email || 'niranjan.sm@example.com');
      setPhone(user.phone || '+91 98765 43210');
      setDepartment(user.department || 'Development');
      setDesignation(
        user.designation || (isTeamLead ? 'Team Lead' : isAdmin ? 'System Administrator' : 'Software Developer')
      );
      if (user.profilePhoto) {
        setPhotoUrl(user.profilePhoto);
      }
    }
  }, [user, isTeamLead, isAdmin]);

  // Handle Photo File Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5 MB. Please choose a smaller photo.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
        setIsDirty(true);
        showToast('New profile photo selected. Tap Save Changes to apply.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Changes Handler
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department.trim(),
        designation: designation.trim(),
      };

      if (photoUrl) {
        payload.profilePhoto = photoUrl;
      }

      if (newPassword.trim()) {
        if (newPassword.length < 8) {
          showToast('New password must be at least 8 characters long.', 'error');
          setSaving(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          showToast('New password and confirm password do not match.', 'error');
          setSaving(false);
          return;
        }
        payload.password = newPassword.trim();
      }

      const success = await updateProfile(payload);
      if (success) {
        setIsDirty(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Profile updated successfully.', 'success');
      } else {
        showToast('Failed to update profile. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast('An error occurred while saving profile changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutOtherDevices = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    showToast('All other device sessions terminated.', 'success');
  };

  const displayAvatar = photoUrl || resolveAvatar(user?.profilePhoto, name, user?.gender);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-28 sm:pb-20 lg:pb-12 min-w-0 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP APP BAR                                                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pt-1 pb-2 px-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
          My Profile
        </h1>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        </div>
      </div>

      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {/* ========================================================================= */}
      {/* 2. TOP HERO PROFILE CARD                                                  */}
      {/* ========================================================================= */}
      <div className="p-4.5 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-purple-500/15 dark:from-blue-900/35 dark:via-indigo-900/30 dark:to-purple-900/35 border border-blue-500/20 dark:border-white/10 shadow-xs flex items-center gap-4">
        {/* Avatar with Camera badge */}
        <div className="relative shrink-0">
          <img
            src={displayAvatar}
            alt={name}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white dark:ring-[#0e1322] shadow-md"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6.5 h-6.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white border-2 border-white dark:border-[#0e1322] shadow-sm flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
            title="Upload Profile Photo"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User identity & Live status */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {name}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
              {formatRoleName(user?.role)}
            </span>
          </div>

          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{activeOrganization?.organizationName || 'Project System Workspace'}</span>
          </p>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <span>Active • Last seen today, 10:30 AM</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HORIZONTAL TAB NAVIGATION                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-2 pt-1">
        {[
          { id: 'info', label: 'Profile Information', icon: User },
          { id: 'security', label: 'Account & Security', icon: Shield },
          { id: 'preferences', label: 'Preferences', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ProfileTab)}
              className={`pb-3 px-2 flex items-center gap-2 text-xs font-bold transition-all relative cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>

              {/* Active Tab Underline Indicator */}
              {isActive && (
                <motion.div
                  layoutId="profileActiveTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-600 dark:bg-cyan-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT PANELS                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence mode="wait">
        {/* --------------------------------------------------------------------- */}
        {/* TAB 1: PROFILE INFORMATION (Matching Your Reference Image)            */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'info' && (
          <motion.div
            key="tab-info"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            {/* Personal Information Container Card */}
            <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              {/* Header without Edit Button (per user instruction) */}
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Personal Information
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage your personal details and contact information
                  </p>
                </div>
              </div>

              {/* Vertical Form Fields with Colored Pastel Squircle Badges */}
              <div className="space-y-3 pt-1">
                {/* 1. Full Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 2. Employee ID (Read-only with Lock icon) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <IdCard className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee ID</span>
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={employeeId}
                      disabled
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-mono text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Email Address */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 4. Phone Number */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Phone className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-medium text-slate-900 dark:text-white focus:bg-white dark:focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 5. Department (Read-only with Lock icon) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</span>
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={department}
                      disabled
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 6. Job Title (Read-only with Lock icon) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Title</span>
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={designation}
                      disabled
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 7. Joining Date (Read-only with Lock icon) */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div className="w-28 sm:w-32 shrink-0">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Joining Date</span>
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <input
                      type="text"
                      value={joiningDate}
                      disabled
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB 2: ACCOUNT & SECURITY                                             */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'security' && (
          <motion.div
            key="tab-security"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            {/* Password Management */}
            <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Password & Authentication
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Update your account credentials and multi-factor security
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2FA Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] mt-2">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                    <p className="text-slate-500 dark:text-slate-400">Require an authenticator app TOTP code on login</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactorAuth}
                    onChange={(e) => {
                      setTwoFactorAuth(e.target.checked);
                      setIsDirty(true);
                    }}
                    className="w-4.5 h-4.5 rounded text-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-500" />
                  Active Device Sessions
                </h3>
                <button
                  type="button"
                  onClick={handleLogoutOtherDevices}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Logout Other Devices
                </button>
              </div>

              <div className="space-y-2.5">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        {sess.type === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{sess.device}</span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          IP: {sess.ip} • {sess.lastActive}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB 3: PREFERENCES                                                    */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'preferences' && (
          <motion.div
            key="tab-preferences"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
              <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-500" />
                  Regional & Display Preferences
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Language</label>
                  <select
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="English (US)">English (US)</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Time Zone</label>
                  <select
                    value={timeZone}
                    onChange={(e) => {
                      setTimeZone(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Asia/Kolkata (+5:30)">Asia/Kolkata (IST +5:30)</option>
                    <option value="UTC">UTC (Universal Time)</option>
                    <option value="America/New_York (-5:00)">America/New_York (EST -5:00)</option>
                    <option value="Europe/London (+0:00)">Europe/London (GMT +0:00)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => {
                      setDateFormat(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Default Dashboard</label>
                  <select
                    value={defaultDashboard}
                    onChange={(e) => {
                      setDefaultDashboard(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Overview">Overview</option>
                    <option value="Executive">Executive</option>
                    <option value="Task Focus">Task Focus</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. FULL WIDTH SAVE CHANGES ACTION BUTTON                                  */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSaveChanges}
          disabled={saving}
          className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  );
}
