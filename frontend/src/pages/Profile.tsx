import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Lock,
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Briefcase,
  IdCard,
  Settings as SettingsIcon,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { formatRoleName, normalizeRole } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

export default function Profile() {
  const navigate = useNavigate();
  const { user, activeOrganization } = useAuthStore();
  const { darkMode, toggleTheme, setSignOutModalOpen } = useUIStore();

  const role = normalizeRole(user?.role);
  const isAdmin = role === 'ROLE_ADMIN';
  const isTeamLead = role === 'ROLE_MANAGER';

  // Display Fields
  const name = user?.name || 'Niranjan S M';
  const email = user?.email || 'niranjan.sm@example.com';
  const phone = user?.phone || '+91 98765 43210';
  const department = user?.department || 'Development';
  const designation =
    user?.designation || (isTeamLead ? 'Team Lead' : isAdmin ? 'System Administrator' : 'Software Developer');
  const employeeId = (user as any)?.employeeId || (user?.id ? `EMP-${user.id}` : (user?.uid ? `EMP-${user.uid}` : 'EMP-00124'));
  const formatJoiningDate = (dateVal: any) => {
    if (!dateVal) return '15 Aug 2024';
    try {
      let d: Date;
      if (typeof dateVal === 'number') {
        d = new Date(dateVal);
      } else if (typeof dateVal === 'object' && dateVal?.seconds) {
        d = new Date(dateVal.seconds * 1000);
      } else if (typeof dateVal === 'object' && dateVal?._seconds) {
        d = new Date(dateVal._seconds * 1000);
      } else if (typeof dateVal === 'string') {
        d = new Date(dateVal);
      } else {
        return '15 Aug 2024';
      }
      if (isNaN(d.getTime())) return '15 Aug 2024';
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '15 Aug 2024';
    }
  };
  const joiningDate = formatJoiningDate(user?.createdAt);

  const displayAvatar = resolveAvatar(user?.profilePhoto, name, user?.gender);

  return (
    <div className="w-full max-w-2xl mx-auto pb-28 sm:pb-20 lg:pb-12 min-w-0 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP APP BAR                                                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between pb-1.5 sm:pb-2 px-0.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title={darkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HERO PROFILE CARD (Variation 1 Clean Executive Layout)             */}
      {/* ========================================================================= */}
      <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500/12 via-indigo-500/10 to-purple-500/15 dark:from-blue-900/35 dark:via-indigo-900/30 dark:to-purple-900/35 border border-blue-500/20 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 sm:gap-3.5 mt-1 sm:mt-1.5">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          {/* Avatar with Ring */}
          <div className="relative shrink-0">
            <img
              src={displayAvatar}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-4 ring-white dark:ring-[#0e1322] shadow-md"
            />
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

        {/* Quick Navigate to Settings Pill */}
        <button
          type="button"
          onClick={() => navigate('/settings?tab=account&edit=true')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
          title="Edit Profile in Settings"
        >
          <SettingsIcon className="w-3.5 h-3.5" />
          <span>Edit in Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. PERSONAL INFORMATION CARD (About Display)                              */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        className="space-y-3 sm:space-y-3.5 mt-2.5 sm:mt-3"
      >
        {/* Personal Information Container Card */}
        <div className="p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#0e1322]/90 border border-slate-200/80 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3 sm:space-y-4">
          {/* Card Header without edit button */}
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 pb-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Personal Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of your identity and organization credentials
              </p>
            </div>
          </div>

          {/* Vertical Display Rows with Colored Pastel Squircle Badges */}
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
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {name}
                </div>
              </div>
            </div>

            {/* 2. Employee ID */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <IdCard className="w-4.5 h-4.5" />
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee ID</span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-mono font-medium text-slate-600 dark:text-slate-400 truncate flex items-center justify-between">
                  <span>{employeeId}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
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
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {email}
                </div>
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
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {phone}
                </div>
              </div>
            </div>

            {/* 5. Department */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Department</span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 truncate flex items-center justify-between">
                  <span>{department}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* 6. Job Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Job Title</span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 truncate flex items-center justify-between">
                  <span>{designation}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>

            {/* 7. Joining Date */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div className="w-28 sm:w-32 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Joining Date</span>
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-100/80 dark:bg-white/[0.03] text-xs font-medium text-slate-600 dark:text-slate-400 truncate flex items-center justify-between">
                  <span>{joiningDate}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Profile CTA -> Directs to Settings */}
        <div className="p-4.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/70 dark:border-blue-500/20 shadow-xs space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <SettingsIcon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Need to change your profile information?
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                Personal credentials, phone number, password updates, and workspace configuration are managed in Settings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/settings?tab=account&edit=true')}
            className="w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Go to Settings to Edit Profile</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </motion.div>

      {/* ========================================================================= */}
      {/* 4. SIGN OUT ACTION                                                        */}
      {/* ========================================================================= */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setSignOutModalOpen(true)}
          className="w-full py-3.5 px-6 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span>Sign Out from Workspace</span>
        </button>
      </div>
    </div>
  );
}
