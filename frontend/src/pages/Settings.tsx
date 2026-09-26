import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Sun, Moon, Shield, Lock, Check, Sparkles, Users,
  FolderGit2, CheckSquare, Bell, FileText, Activity, Database, Link as LinkIcon,
  Layout, Eye, EyeOff, Clock, Calendar, Mail, AlertTriangle, Monitor, Sliders, Palette, CheckCircle2, ArrowLeft, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore, AccentColor, DisplayDensity, ThemeMode, ACCENT_PRESETS } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatRoleName } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

export default function Settings() {
  const { user, updateProfile, logout } = useAuthStore();
  const {
    darkMode, toggleTheme, themeMode, setThemeMode, accentColor, setAccentColor,
    displayDensity, setDisplayDensity, sidebarExpanded, toggleSidebar,
    dashboardPrefs, setDashboardPrefs, setView
  } = useUIStore();

  const role = user?.role || 'ROLE_EMPLOYEE';
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER' || (role as string) === 'ROLE_TEAM_LEAD';
  const isEmployee = role === 'ROLE_EMPLOYEE';

  // Active sub-tab state based on role defaults (Clean 4-category architecture)
  const [activeTab, setActiveTab] = useState<string>('appearance');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedDetailsSummary, setUpdatedDetailsSummary] = useState<{ email: string; name: string; passChanged: boolean } | null>(null);

  // Lock background scrolling when the success modal is active
  useScrollLock(showSuccessModal);

  // Account form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+1 (555) 234-5678');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [experience, setExperience] = useState(user?.experience || 5);
  const [skills, setSkills] = useState(user?.skills || '');
  const [twoFactor, setTwoFactor] = useState(false);

  // Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passError, setPassError] = useState('');

  // Sync state with logged in user when user state updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '+1 (555) 234-5678');
      setDesignation(user.designation || '');
      setDepartment(user.department || '');
      setExperience(user.experience || 5);
      setSkills(user.skills || '');
    }
  }, [user]);

  // Organization settings state (Admin)
  const [orgName, setOrgName] = useState('Prologue Enterprise Solutions');
  const [orgIndustry, setOrgIndustry] = useState('Healthcare & Enterprise Software');
  const [orgEmail, setOrgEmail] = useState('contact@prologue.io');
  const [workingHours, setWorkingHours] = useState('09:00 - 18:00 (40h/week)');

  // Team & Project settings state (Team Lead)
  const [defaultProjectStatus, setDefaultProjectStatus] = useState('ACTIVE');
  const [defaultTaskPriority, setDefaultTaskPriority] = useState('HIGH');
  const [weeklyTargetHours, setWeeklyTargetHours] = useState('40');

  // Employee settings state
  const [autoTimer, setAutoTimer] = useState(true);
  const [breakDuration, setBreakDuration] = useState('15 mins');

  // Integrations mock state
  const [integrations, setIntegrations] = useState<{ [key: string]: boolean }>({
    github: true,
    slack: true,
    googleCalendar: true,
    gitlab: false,
    emailServer: true,
  });

  const [saving, setSaving] = useState(false);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = { name, email, designation, department, experience, skills, phone };
    const success = await updateProfile(payload);
    setSaving(false);
    if (success) {
      setUpdatedDetailsSummary({
        email,
        name,
        passChanged: false
      });
      setShowSuccessModal(true);
      triggerSuccess(`Profile parameters updated successfully!`);
    }
  };

  const handleSecurityPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (!newPass.trim()) {
      setPassError('Please enter a new password!');
      return;
    }
    if (newPass.trim() !== confirmPass.trim()) {
      setPassError('New password and confirm password do not match!');
      return;
    }
    if (newPass.trim().length < 6) {
      setPassError('Password must be at least 6 characters long!');
      return;
    }

    setSaving(true);
    const success = await updateProfile({ password: newPass.trim() });
    setSaving(false);
    if (success) {
      setUpdatedDetailsSummary({
        email: user?.email || '',
        name: user?.name || '',
        passChanged: true
      });
      setShowSuccessModal(true);
      triggerSuccess('Account password updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  };

  const toggleIntegration = (key: string) => {
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const handleLockWorkspace = () => {
    triggerSuccess('Workspace locked for current session.');
  };

  const connectedCount = Object.values(integrations).filter(Boolean).length;

  // Dynamically compute available settings tabs per role (Clean 4-Category Architecture)
  const getTabs = () => {
    const baseTabs = [
      {
        id: 'appearance',
        label: 'Appearance & Theme',
        mobileLabel: 'Appearance',
        icon: Palette,
        chip: darkMode ? 'Dark' : 'Light',
        chipType: 'neutral' as const
      },
      {
        id: 'security',
        label: 'Security & Password',
        mobileLabel: 'Security',
        icon: Shield,
        chip: 'Active',
        chipType: 'success' as const
      },
      {
        id: 'integrations',
        label: 'Connected Tools',
        mobileLabel: 'Connected Tools',
        icon: LinkIcon,
        chip: `${connectedCount} Linked`,
        chipType: 'info' as const
      },
      {
        id: 'account',
        label: 'Profile & Account',
        mobileLabel: 'Profile',
        icon: User,
        chip: 'Verified',
        chipType: 'success' as const
      },
    ];

    if (isAdmin) {
      return [
        ...baseTabs,
        {
          id: 'organization',
          label: 'Organization & System',
          mobileLabel: 'Organization',
          icon: Sparkles,
          chip: 'Admin',
          chipType: 'warning' as const
        },
      ];
    }

    return baseTabs;
  };

  const tabs = getTabs();
  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveTabIcon = activeTabObj?.icon || User;

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Desktop Title Header */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-500" /> {formatRoleName(user?.role, 'title')} Settings
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Role-specific system settings, security rules, appearance themes, and integration parameters.
          </p>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/30 self-start sm:self-auto">
          Role: {formatRoleName(user?.role)}
        </span>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 text-xs font-black flex items-center gap-2 shadow-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Success Popup Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overscroll-contain touch-none select-none"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md max-h-[88vh] overflow-y-auto bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center select-none modal-dialog-contain overscroll-contain"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Account Saved Successfully!</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Your profile parameters and credentials have been updated.
                </p>
              </div>

              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-left text-xs space-y-2 border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Full Name:</span>
                  <span className="font-black text-slate-900 dark:text-white">{updatedDetailsSummary?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Updated Email:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">{updatedDetailsSummary?.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">Password Status:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {updatedDetailsSummary?.passChanged ? '🔒 Password Changed' : '✓ Unchanged'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-2xl shadow-lg cursor-pointer transition-all"
              >
                ✓ OK, Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MOBILE MENU VIEW (!mobileDetailOpen) - EXACT OPTION 3 LUXURY PILL DESIGN  */}
      {/* ========================================================================= */}
      {!mobileDetailOpen && (
        <div className="md:hidden space-y-4 max-w-lg mx-auto">
          {/* Card 1: Top Header Card */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 shadow-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {formatRoleName(user?.role, 'title')} Settings
              </h1>
              <div className="flex items-center gap-2 shrink-0">
                <img
                  src={resolveAvatar(user?.profilePhoto, user?.name, user?.gender)}
                  alt="Avatar"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-teal-500/40 shadow-sm"
                />
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 dark:text-teal-300 border border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.15)]">
                  {formatRoleName(user?.role)}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Role-specific system settings, security rules, appearance themes, and integration parameters.
            </p>
          </div>

          {/* Middle 4 Pill Buttons */}
          <div className="space-y-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileDetailOpen(true);
                  }}
                  className="w-full px-4 py-3 sm:py-3.5 rounded-full bg-slate-900/60 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-800/50 active:scale-[0.99] transition-all duration-200 shadow-lg shadow-black/20 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-blue-500/15 border border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.25)] group-hover:scale-105 group-hover:border-blue-400/50 transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate tracking-tight">
                      {tab.mobileLabel || tab.label}
                    </span>
                  </div>

                  <div className="shrink-0 pl-2">
                    {tab.chipType === 'neutral' && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/60 shadow-xs">
                        {tab.chip}
                      </span>
                    )}
                    {tab.chipType === 'success' && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                        {tab.chip}
                      </span>
                    )}
                    {tab.chipType === 'info' && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.25)]">
                        {tab.chip}
                      </span>
                    )}
                    {tab.chipType === 'warning' && (
                      <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                        {tab.chip}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Card 3: Bottom Storage & Sync + Actions */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-slate-900/60 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 shadow-xl flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 pr-2">
              <div className="w-full h-3 rounded-full bg-slate-800/90 p-0.5 overflow-hidden border border-slate-700/50 shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all duration-500" 
                  style={{ width: '28%' }}
                />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide mt-2">
                Cache & Sync • 14.8 MB / 100 MB
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-all shadow-sm cursor-pointer text-center"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={handleLockWorkspace}
                className="px-4 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/80 hover:bg-blue-500/20 hover:border-blue-500/40 text-slate-300 hover:text-blue-300 text-xs font-semibold transition-all shadow-sm cursor-pointer text-center"
              >
                Lock Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className={`glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 ${mobileDetailOpen ? 'flex flex-col' : 'hidden'} md:flex md:flex-row min-h-[500px]`}>
        {/* Left Sidebar Navigation Tabs */}
        <div className="hidden md:flex w-64 border-r border-slate-200/30 dark:border-white/5 flex-shrink-0 bg-slate-500/5 p-3 flex-col justify-between overflow-y-auto max-h-[650px]">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-1">Settings Menu</p>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-2xl font-bold text-xs flex items-center justify-between gap-2.5 cursor-pointer transition-all duration-200 group ${
                    isActive
                      ? 'bg-blue-600/15 border border-blue-500/40 text-blue-400 shadow-md shadow-blue-500/10 scale-[1.01]'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-200/70 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:text-blue-500'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="truncate font-bold text-xs">{tab.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.chip}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop Storage Mini-Card */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 mt-4">
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1.5">
              <div className="h-full rounded-full bg-gradient-to-r from-teal-400 via-indigo-500 to-purple-500" style={{ width: '28%' }} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Cache & Sync • 14.8 MB / 100 MB</p>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Mobile Back Button & Subheader */}
          <div className="md:hidden flex items-center justify-between pb-3.5 border-b border-slate-200/50 dark:border-white/10 mb-2">
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 font-bold text-xs transition-colors cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Back to Settings</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
              <ActiveTabIcon className="w-4 h-4 text-blue-500" />
              <span>{activeTabObj?.label}</span>
            </div>
          </div>
          {/* ========================================================================= */}
          {/* TAB: PROFILE & ACCOUNT OVERVIEW                                           */}
          {/* ========================================================================= */}
          {activeTab === 'account' && (
            <div className="space-y-6 max-w-2xl">
              {/* Profile Overview Hero Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={resolveAvatar(user?.profilePhoto, user?.name, user?.gender)}
                      alt="Avatar"
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/40 shadow-md"
                    />
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                        {user?.name}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0">
                        {formatRoleName(user?.role)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5 truncate">
                      {user?.designation || 'Software Engineer'} • {user?.department || 'Engineering'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView('profile');
                    window.history.pushState(null, '', '/profile');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" /> Open Full Profile
                </button>
              </div>

              {/* Quick Contact & Parameter Edit Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-2">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" /> Profile & Contact Parameters
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">Synced across workspace</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Experience (Years)</label>
                    <input
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-white" />
                    )}
                    <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}



          {/* ==================================== */}
          {/* TAB 3: SECURITY & 2FA */}
          {/* ==================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-500" /> Security & Session Management
              </h3>

              {/* 2FA switches */}
              <div className="flex items-center justify-between p-4 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">Two-Factor Authentication (2FA)</p>
                  <p className="text-[10px] text-slate-400 font-medium">Add time-based OTP verification code step on logins.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setTwoFactor(!twoFactor)}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${twoFactor ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                >
                  <div className={`h-4.5 w-4.5 rounded-full bg-white transition-transform duration-300 ${twoFactor ? 'translate-x-5.5' : ''}`}></div>
                </button>
              </div>

              {/* Password change form */}
              <form onSubmit={handleSecurityPasswordSubmit} className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full pl-4 pr-11 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title={showCurrentPass ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPass}
                      onChange={(e) => { setNewPass(e.target.value); setPassError(''); }}
                      className="w-full pl-4 pr-11 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title={showNewPass ? 'Hide password' : 'Show password'}
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPass}
                      onChange={(e) => { setConfirmPass(e.target.value); setPassError(''); }}
                      className={`w-full pl-4 pr-11 py-2 bg-white/5 border rounded-xl text-slate-800 dark:text-white outline-none font-semibold text-xs transition-all ${
                        confirmPass && confirmPass !== newPass
                          ? 'border-rose-500/70 focus:ring-2 focus:ring-rose-500/20'
                          : confirmPass && confirmPass === newPass
                          ? 'border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20'
                          : 'border-slate-200/50 dark:border-white/5 focus:border-blue-500/50'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title={showConfirmPass ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passError && <p className="text-xs font-bold text-rose-500 mt-1">⚠️ {passError}</p>}
                {confirmPass && confirmPass === newPass && newPass.length >= 6 && (
                  <p className="text-xs font-bold text-emerald-500 mt-1">✓ Passwords match</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Lock className="w-4 h-4 text-white" />
                  )}
                  <span>{saving ? 'Updating Password...' : 'Update Account Password'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ==================================== */}
          {/* TAB 4: INTEGRATIONS */}
          {/* ==================================== */}
          {activeTab === 'integrations' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-500" /> External Integrations & Webhooks
              </h3>

              <div className="space-y-3">
                {[
                  { key: 'github', name: 'GitHub Integration', desc: 'Sync repositories, pull requests, and commit logs' },
                  { key: 'slack', name: 'Slack Notifications', desc: 'Send automated task updates and review alerts' },
                  { key: 'googleCalendar', name: 'Google Calendar Sync', desc: 'Export project deadlines and meetings' },
                  { key: 'gitlab', name: 'GitLab Enterprise', desc: 'Connect GitLab CI/CD pipelines' },
                  { key: 'emailServer', name: 'SMTP Email Gateway', desc: 'Dispatch daily digest reports and security notices' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleIntegration(item.key)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                        integrations[item.key]
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : 'bg-white/10 text-slate-400 border border-slate-500/20 hover:text-white'
                      }`}
                    >
                      {integrations[item.key] ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================================== */}
          {/* TAB 5: APPEARANCE & DISPLAY DENSITY */}
          {/* ==================================== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" /> Appearance & Display Density Controls
              </h3>

              {/* 1. Display Density Controls */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Display Density
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Control paddings, spacing density, and item sizes across all views.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'compact',
                      name: 'Compact',
                      icon: '⚡',
                      desc: 'High-density view for maximum data visibility with tight padding.',
                    },
                    {
                      id: 'comfortable',
                      name: 'Comfortable',
                      icon: '📐',
                      desc: 'Balanced spacing, standard padding, and optimal readability.',
                    },
                    {
                      id: 'spacious',
                      name: 'Spacious',
                      icon: '🛋️',
                      desc: 'Generous padding and airy layout designed for touchscreens.',
                    },
                  ].map((option) => {
                    const isSelected = displayDensity === option.id;
                    return (
                      <div
                        key={option.id}
                        onClick={() => {
                          setDisplayDensity(option.id as DisplayDensity);
                          triggerSuccess(`Display density updated to ${option.name}!`);
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-md ring-2 ring-blue-500/20 scale-[1.02]'
                            : 'bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{option.icon}</span>
                          {isSelected && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white font-black text-[9px] rounded-full uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white">{option.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Theme Mode Selection (Light / Dark / System) */}
              <div className="space-y-3 pt-4 border-t border-slate-200/30 dark:border-white/5">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Theme Mode
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Switch between crisp white mode and dark theme.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'light', name: 'Light Mode (White)', icon: Sun },
                    { id: 'dark', name: 'Dark Mode', icon: Moon },
                    { id: 'system', name: 'System Default', icon: Monitor },
                  ].map((modeItem) => {
                    const Icon = modeItem.icon;
                    const isSelected = themeMode === modeItem.id;
                    return (
                      <div
                        key={modeItem.id}
                        onClick={() => {
                          setThemeMode(modeItem.id as ThemeMode);
                          triggerSuccess(`Theme mode set to ${modeItem.name}!`);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-md ring-2 ring-blue-500/20 scale-[1.02]'
                            : 'bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className={`p-2 rounded-xl border ${isSelected ? 'bg-blue-500 text-white' : 'bg-white/10 border-white/10'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{modeItem.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Accent Color Presets */}
              <div className="space-y-3 pt-4 border-t border-slate-200/30 dark:border-white/5">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Accent Color Preset
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Choose a primary accent hue for buttons, badges, and focus rings.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {Object.entries(ACCENT_PRESETS).map(([key, value]) => {
                    const isSelected = accentColor === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setAccentColor(key as AccentColor);
                          triggerSuccess(`Accent color updated to ${key}!`);
                        }}
                        className={`px-4 py-2.5 rounded-2xl border text-xs font-black capitalize flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400 shadow-md ring-2 ring-blue-500/20 scale-105'
                            : 'bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-xs"
                          style={{ backgroundColor: value.color }}
                        />
                        <span>{key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: ADMIN SPECIFIC ORGANIZATION & HUB SHORTCUTS                        */}
          {/* ========================================================================= */}
          {activeTab === 'organization' && isAdmin && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Organization Configuration
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Industry / Domain</label>
                    <input
                      type="text"
                      value={orgIndustry}
                      onChange={(e) => setOrgIndustry(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Primary Contact Email</label>
                    <input
                      type="email"
                      value={orgEmail}
                      onChange={(e) => setOrgEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerSuccess('Organization config saved.')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all"
                  >
                    Save Org Settings
                  </button>
                </div>
              </div>

              {/* Admin Quick Module Access Tiles */}
              <div className="pt-4 border-t border-slate-200/30 dark:border-white/5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Admin Control Hub Shortcuts</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setView('users')}
                    className="p-3.5 rounded-xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-purple-500/40 text-left group transition-all cursor-pointer"
                  >
                    <Users className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">User Directory</p>
                    <p className="text-[10px] text-slate-400">Manage user accounts</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('roles')}
                    className="p-3.5 rounded-xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-blue-500/40 text-left group transition-all cursor-pointer"
                  >
                    <Shield className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Roles Matrix</p>
                    <p className="text-[10px] text-slate-400">Permission policies</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('audit-logs')}
                    className="p-3.5 rounded-xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:border-amber-500/40 text-left group transition-all cursor-pointer"
                  >
                    <Activity className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Audit Logs</p>
                    <p className="text-[10px] text-slate-400">Security event feed</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
