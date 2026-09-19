import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Sun, Moon, Shield, Lock, Check, Sparkles, Users,
  FolderGit2, CheckSquare, Bell, FileText, Activity, Database, Link as LinkIcon,
  Layout, Eye, EyeOff, Clock, Calendar, Mail, AlertTriangle, Monitor, Sliders, Palette, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore, AccentColor, DisplayDensity, ThemeMode, ACCENT_PRESETS } from '../store/useUIStore';
import { useScrollLock } from '../hooks/useScrollLock';

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const {
    darkMode, toggleTheme, themeMode, setThemeMode, accentColor, setAccentColor,
    displayDensity, setDisplayDensity, sidebarExpanded, toggleSidebar,
    dashboardPrefs, setDashboardPrefs, setView
  } = useUIStore();

  const role = user?.role || 'ROLE_EMPLOYEE';
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER' || (role as string) === 'ROLE_TEAM_LEAD';
  const isEmployee = role === 'ROLE_EMPLOYEE';

  // Active sub-tab state based on role defaults
  const [activeTab, setActiveTab] = useState<string>('account');
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
    setPassError('');
    if (newPass.trim()) {
      if (newPass.trim().length < 6) {
        setPassError('Password must be at least 6 characters long!');
        return;
      }
    }
    setSaving(true);
    const payload: any = { name, email, designation, department, experience, skills, phone };
    if (newPass.trim()) {
      payload.password = newPass.trim();
    }
    const success = await updateProfile(payload);
    setSaving(false);
    if (success) {
      setUpdatedDetailsSummary({
        email,
        name,
        passChanged: !!newPass.trim()
      });
      setShowSuccessModal(true);
      triggerSuccess(`Account & security parameters saved! Email set to ${email}`);
      if (newPass.trim()) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
      }
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
      triggerSuccess('Account password updated successfully!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    }
  };

  const toggleIntegration = (key: string) => {
    setIntegrations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamically compute available settings tabs per role
  const getTabs = () => {
    if (isAdmin) {
      return [
        { id: 'account', label: 'Account', icon: User },
        { id: 'organization', label: 'Organization', icon: Sparkles },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'roles', label: 'Roles & Permissions', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'audit', label: 'Audit & Activity', icon: Activity },
        { id: 'data', label: 'Data & Backup', icon: Database },
        { id: 'integrations', label: 'Integrations', icon: LinkIcon },
        { id: 'appearance', label: 'Appearance', icon: Palette },
      ];
    } else if (isTeamLead) {
      return [
        { id: 'account', label: 'Account', icon: User },
        { id: 'team', label: 'Team', icon: Users },
        { id: 'projects', label: 'Projects', icon: FolderGit2 },
        { id: 'tasks', label: 'Tasks & Workflow', icon: CheckSquare },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'work', label: 'Work & Productivity', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'integrations', label: 'Integrations', icon: LinkIcon },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'appearance', label: 'Appearance', icon: Palette },
      ];
    } else {
      return [
        { id: 'account', label: 'Account', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'time', label: 'Time Tracking', icon: Clock },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'email', label: 'Email Preferences', icon: Mail },
        { id: 'security', label: 'Security', icon: Lock },
      ];
    }
  };

  const tabs = getTabs();

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-500" /> {user?.role.replace('ROLE_', '')} Settings
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Role-specific system settings, security rules, appearance themes, and integration parameters.
          </p>
        </div>

        <span className="text-xs font-extrabold px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20 self-start sm:self-auto">
          Role: {user?.role}
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
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center select-none"
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

      {/* Main Settings Panel */}
      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 flex flex-col md:flex-row min-h-[500px]">
        {/* Left Sidebar Navigation Tabs */}
        <div className="w-full md:w-60 border-r border-slate-200/30 dark:border-white/5 flex-shrink-0 bg-slate-500/5 p-3 space-y-1 overflow-y-auto max-h-[600px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* ==================================== */}
          {/* TAB 1: ACCOUNT */}
          {/* ==================================== */}
          {activeTab === 'account' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" /> Account Profile Parameters
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Experience (Years)</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400">Key Skills (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="React, Java, Spring Boot, SQL"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 font-semibold text-xs"
                />
              </div>

              {/* Password update section inside Account Parameters */}
              <div className="space-y-3 pt-2 border-t border-slate-200/30 dark:border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Password</label>
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

                {passError && <p className="text-xs font-bold text-rose-500 mt-1">⚠️ {passError}</p>}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span>{saving ? 'Saving Parameters...' : 'Save Account Parameters'}</span>
              </button>
            </form>
          )}

          {/* ==================================== */}
          {/* TAB 2: APPEARANCE & THEME PREFERENCES */}
          {/* ==================================== */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" /> Theme Mode & Accent Customization
              </h3>

              {/* Theme Mode Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Theme Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      themeMode === 'light'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-500" /> Light Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-indigo-400" /> Dark Mode
                  </button>

                  <button
                    type="button"
                    onClick={() => setThemeMode('system')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                      themeMode === 'system'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-purple-400" /> System Default
                  </button>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Accent Color Palette</label>
                <div className="flex flex-wrap gap-3">
                  {(['blue', 'purple', 'green', 'orange', 'red', 'teal'] as AccentColor[]).map((col) => {
                    const preset = ACCENT_PRESETS[col];
                    const isSelected = accentColor === col;
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setAccentColor(col)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer transition-all transform hover:scale-110 shadow-md ${
                          isSelected ? 'ring-4 ring-white/50 scale-110' : ''
                        }`}
                        style={{ backgroundColor: preset.color }}
                        title={col.toUpperCase()}
                      >
                        {isSelected && <Check className="w-5 h-5 text-white font-black" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Display Density */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Display Density</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['compact', 'comfortable', 'spacious'] as DisplayDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDisplayDensity(d)}
                      className={`py-2 rounded-xl border text-xs font-bold capitalize transition-all cursor-pointer ${
                        displayDensity === d
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                          : 'border-slate-200/50 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar State Preference */}
              <div className="flex items-center justify-between p-3.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-2xl">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">Remember Sidebar State</p>
                  <p className="text-[10px] text-slate-400 font-medium">Keep sidebar {sidebarExpanded ? 'expanded' : 'collapsed'} across sessions.</p>
                </div>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${sidebarExpanded ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                >
                  <div className={`h-4.5 w-4.5 rounded-full bg-white transition-transform duration-300 ${sidebarExpanded ? 'translate-x-5.5' : ''}`}></div>
                </button>
              </div>

              {/* Dashboard Preferences */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Dashboard Widget Preferences</label>
                <div className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dashboardPrefs.showWidgets}
                      onChange={(e) => setDashboardPrefs({ showWidgets: e.target.checked })}
                      className="rounded accent-blue-600"
                    />
                    <span>Show Overview Metric Widgets</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dashboardPrefs.showStats}
                      onChange={(e) => setDashboardPrefs({ showStats: e.target.checked })}
                      className="rounded accent-blue-600"
                    />
                    <span>Show Real-time Statistics Charts</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dashboardPrefs.showRecentActivity}
                      onChange={(e) => setDashboardPrefs({ showRecentActivity: e.target.checked })}
                      className="rounded accent-blue-600"
                    />
                    <span>Show Recent System Activity Stream</span>
                  </label>
                </div>
              </div>
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

          {/* ==================================== */}
          {/* TAB 5: ADMIN SPECIFIC MODULES */}
          {/* ==================================== */}
          {activeTab === 'organization' && isAdmin && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">Organization Configuration</h3>
              <div className="space-y-3">
                <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 rounded-xl text-xs" />
                <input type="text" value={orgIndustry} onChange={(e) => setOrgIndustry(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 rounded-xl text-xs" />
                <input type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} className="w-full px-3 py-2 bg-white/5 border border-slate-200/50 rounded-xl text-xs" />
                <button onClick={() => triggerSuccess('Organization config saved.')} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">Save Org Settings</button>
              </div>
            </div>
          )}

          {activeTab === 'users' && isAdmin && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">User Directory & Permissions Quick Access</h3>
              <p className="text-xs text-slate-400">Jump directly to the full user management control panel.</p>
              <button onClick={() => setView('users')} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                Open User Directory Module →
              </button>
            </div>
          )}

          {activeTab === 'roles' && isAdmin && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">Roles & Permissions Control</h3>
              <p className="text-xs text-slate-400">Configure role access levels across all workspace modules.</p>
              <button onClick={() => setView('roles')} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                Open Role & Permission Matrix →
              </button>
            </div>
          )}

          {activeTab === 'audit' && isAdmin && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">System Audit Logs</h3>
              <p className="text-xs text-slate-400">View real-time security events and admin activity logs.</p>
              <button onClick={() => setView('audit-logs')} className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer">
                Open Audit Logs Hub →
              </button>
            </div>
          )}

          {/* Fallback for other tabs */}
          {['notifications', 'data', 'team', 'projects', 'tasks', 'work', 'calendar', 'documents', 'time', 'email'].includes(activeTab) && (
            <div className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2 capitalize">{activeTab} Settings</h3>
              <p className="text-xs text-slate-400">Configure preferences and defaults for {activeTab}.</p>
              <button onClick={() => triggerSuccess(`${activeTab.toUpperCase()} preferences saved.`)} className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl">Save Preferences</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
