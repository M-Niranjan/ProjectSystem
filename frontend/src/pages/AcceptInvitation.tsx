import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Mail, Lock, Eye, EyeOff, ArrowRight,
  CheckCircle2, AlertCircle, ShieldCheck, Sun, Moon,
  UserCheck
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import api from '../services/api';

interface InvitationDetails {
  valid: boolean;
  email: string;
  name: string;
  role: string;
  roleCode?: string;
  organizationId: string;
  organizationName: string;
  organizationCode: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const { darkMode, toggleTheme } = useUIStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in this link. Please check your invitation email.');
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/auth/invitation?token=${encodeURIComponent(token)}`);
        if (res.data && res.data.valid) {
          setInvitation(res.data);
        } else {
          setError(res.data?.message || 'Invalid or expired invitation link.');
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to verify invitation. The link may have expired.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/api/auth/accept-invitation', {
        token,
        password: password.trim(),
      });

      if (res.data?.success) {
        setSuccess('Your account has been activated successfully! Redirecting to sign in...');
        setTimeout(() => {
          navigate(`/?workspace=${invitation?.organizationCode || ''}`, { replace: true });
        }, 1800);
      } else {
        setError(res.data?.message || 'Failed to activate account. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to complete registration. Please try again or contact your administrator.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatRole = (role?: string, roleCode?: string) => {
    const raw = (roleCode || role || '').toUpperCase();
    if (raw.includes('ADMIN')) return 'Administrator';
    if (raw.includes('MANAGER') || raw.includes('LEAD')) return 'Team Leader';
    return 'Employee';
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-50 dark:bg-[#07090e]">
      {/* Background Architectural Blueprint Grid */}
      <div className="blueprint-grid-overlay" aria-hidden="true" />

      {/* Top-Right Theme Toggle */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 px-3 sm:px-3.5 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 hover:scale-105 transition-all cursor-pointer shadow-lg flex items-center gap-2 text-xs font-bold"
          title="Toggle Light / Dark Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          <span className="hidden xs:inline">{darkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <img
            src="/logo.png"
            alt="TaskFlow Logo"
            className="w-16 h-16 object-contain drop-shadow-lg mb-3.5 transition-transform hover:scale-105"
          />

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Task<span className="text-blue-600 dark:text-blue-400">Flow</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Project Management System
          </p>
        </div>

        {/* Obsidian Glass Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full obsidian-glass-card p-5 sm:p-8 md:p-9 shadow-2xl relative transition-all"
        >
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-400">Verifying workspace invitation...</p>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 mb-3">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Join Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Set your password to activate your account
                </p>
              </div>

              {/* Workspace Details Pill Card */}
              {invitation && (
                <div className="bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      {invitation.organizationName}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                      {invitation.organizationCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Role: <strong className="text-slate-800 dark:text-slate-200">{formatRole(invitation.role, invitation.roleCode)}</strong></span>
                    <span>Invited: <strong className="text-slate-800 dark:text-slate-200">{invitation.name || invitation.email.split('@')[0]}</strong></span>
                  </div>
                </div>
              )}

              {/* Success Notification */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl p-3 mb-5 text-xs font-medium flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{success}</span>
                </motion.div>
              )}

              {/* Error Notification */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl p-3 mb-5 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {invitation && !success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Field (Read-only) */}
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type="email"
                        value={invitation.email}
                        disabled
                        className="obsidian-input w-full pl-10 pr-4 py-3 opacity-70 bg-slate-100/50 dark:bg-white/[0.02] cursor-not-allowed text-xs font-medium outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create Password (min 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="obsidian-input w-full pl-10 pr-10 py-3 placeholder-slate-400 text-xs font-medium outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer z-10"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        className="obsidian-input w-full pl-10 pr-10 py-3 placeholder-slate-400 text-xs font-medium outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer z-10"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-obsidian-submit w-full py-3.5 px-4 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate &amp; Join Workspace</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Already have an account link */}
              <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-1.5 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Already have an active account?</span>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>

              {/* Restricted Workspace Notice */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  Secure Workspace Invitation &bull; Authorized recipients only.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
