import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, KeyRound,
  CheckCircle2, X, ShieldCheck, AlertCircle,
  Sun, Moon, Building2
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import api from '../services/api';
import { signInWithEmailPassword, signInWithGoogle, fetchFirestoreUserDoc } from '../services/firebase';
import { getDashboardPathForRole, normalizeRole } from '../services/authRoles';
import { useScrollLock } from '../hooks/useScrollLock';

// Validation Schemas
const loginSchema = z.object({
  workspaceCode: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showWorkspaceInput, setShowWorkspaceInput] = useState(false);

  // Forgot password OTP step modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  useScrollLock(showForgotModal);

  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');

  const { login, requestOtp, verifyOtp, resetPasswordWithOtp, error, loading, clearError } = useAuthStore();
  const { darkMode, toggleTheme, showToast, startLoginSplash, finishLoginSplash, cancelLoginSplash } = useUIStore();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
    getValues
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      workspaceCode: '',
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    resetLoginForm({ workspaceCode: '', email: '', password: '' });
    clearError();
    // Wipe any delayed browser autofill after DOM render
    const timer = setTimeout(() => {
      resetLoginForm({ workspaceCode: '', email: '', password: '' });
    }, 150);
    return () => clearTimeout(timer);
  }, [resetLoginForm, clearError]);

  // Show "Signed out successfully" toast when user arrives after signing out
  React.useEffect(() => {
    try {
      if (localStorage.getItem('pms_signed_out_success') === '1') {
        localStorage.removeItem('pms_signed_out_success');
        // Small delay so Login page is fully mounted before showing toast
        setTimeout(() => {
          showToast('✅ Signed out successfully. See you soon!', 'success', 4000);
        }, 400);
      }
    } catch (_e) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeAfterLogin = async (fallbackRole?: string | null) => {
    useUIStore.getState().hideToast();
    resetLoginForm();
    let memberships = useAuthStore.getState().orgMemberships;
    if (!memberships || memberships.length === 0) {
      try {
        memberships = await useAuthStore.getState().fetchMyOrganizations();
      } catch (_e) {}
    }

    const activeOrgId = useAuthStore.getState().activeOrganizationId;

    if (memberships && memberships.length > 1 && !activeOrgId) {
      navigate('/select-organization', { replace: true });
      return;
    }

    let detectedRole: string | null = null;

    if (memberships && memberships.length === 1 && !activeOrgId) {
      await useAuthStore.getState().setActiveOrganization(memberships[0].organizationId);
      detectedRole = normalizeRole(memberships[0].roleCode || memberships[0].role || fallbackRole);
    } else if (activeOrgId) {
      const activeOrg = useAuthStore.getState().activeOrganization;
      detectedRole = normalizeRole(activeOrg?.roleCode || activeOrg?.role || useAuthStore.getState().activeOrgRole || fallbackRole);
    } else if (fallbackRole) {
      detectedRole = normalizeRole(fallbackRole);
    }

    // Requirement 25 & 26: If role cannot be determined, DO NOT default to Employee.
    if (!detectedRole) {
      useAuthStore.setState({
        error: 'Your account role could not be verified. Please contact your administrator.',
        loading: false,
      });
      return;
    }

    const targetRoute = getDashboardPathForRole(detectedRole);
    if (!targetRoute) {
      useAuthStore.setState({
        error: 'Your account role could not be verified. Please contact your administrator.',
        loading: false,
      });
      return;
    }

    navigate(targetRoute, { replace: true });
  };

  const onLoginSubmit = async (data: any) => {
    clearError();
    startLoginSplash(); // show global splash (survives navigation)
    useAuthStore.setState({ loading: true, error: null });
    const startTime = Date.now();
    const email = (data.email || '').trim();
    const password = (data.password || '').trim();
    const workspaceCode = (data.workspaceCode || '').trim() || undefined;

    let success = false;
    let targetUserRole: string | null = null;

    // 1. First attempt Firebase Authentication
    try {
      const userCredential = await signInWithEmailPassword(email, password);
      const user = userCredential.user;
      if (user && user.uid) {
        const ok = await useAuthStore.getState().loginWithFirebase(user, rememberMe, workspaceCode);
        if (ok) {
          success = true;
          const currentUser = useAuthStore.getState().user;
          targetUserRole = normalizeRole(currentUser?.role);
        }
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase Auth sign in attempt skipped:', firebaseErr?.code || firebaseErr?.message);
    }

    // 2. Attempt Backend API login
    if (!success) {
      try {
        const ok = await login({ email, password, workspaceCode }, rememberMe);
        if (ok) {
          success = true;
          const currentUser = useAuthStore.getState().user;
          targetUserRole = normalizeRole(currentUser?.role);
        }
      } catch (backendErr: any) {
        console.error('Backend login error:', backendErr);
      }
    }

    if (success && targetUserRole) {
      // Ensure splash is visible for at least 2000ms (2.0s) so the animation plays fully
      const elapsed = Date.now() - startTime;
      const minDisplayMs = 2000;
      if (elapsed < minDisplayMs) {
        await new Promise((r) => setTimeout(r, minDisplayMs - elapsed));
      }
      // Navigate FIRST — splash stays alive in global store during unmount
      await routeAfterLogin(targetUserRole);
      // finishLoginSplash fades out and cleans up (450ms fade)
      await finishLoginSplash();
      return;
    }

    cancelLoginSplash();
    useAuthStore.setState({ loading: false });
    const currentError = useAuthStore.getState().error;
    if (!currentError) {
      useAuthStore.setState({ error: 'Unable to sign in. Please verify your credentials or try again.' });
    }
  };

  // Dedicated Google Sign In (ONLY Google Provider)
  const handleGoogleSignIn = async () => {
    clearError();
    setGoogleLoading(true);
    startLoginSplash(); // show global splash
    useAuthStore.setState({ loading: true, error: null });
    const startTime = Date.now();
    const workspaceCode = (getValues('workspaceCode') || '').trim() || undefined;

    try {
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;
      if (user && user.uid) {
        const ok = await useAuthStore.getState().loginWithFirebase(user, rememberMe, workspaceCode);
        if (ok) {
          const currentUser = useAuthStore.getState().user;
          const role = normalizeRole(currentUser?.role);
          const elapsed = Date.now() - startTime;
          const minDisplayMs = 2000;
          if (elapsed < minDisplayMs) {
            await new Promise((r) => setTimeout(r, minDisplayMs - elapsed));
          }
          await routeAfterLogin(role);
          await finishLoginSplash();
          return;
        }
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      cancelLoginSplash();
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        useAuthStore.setState({ loading: false });
      } else {
        useAuthStore.setState({
          error: err.message || 'Google sign-in could not be completed. Please try again.',
          loading: false,
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    const currentEmail = getValues('email');
    setForgotEmail(currentEmail || '');
    setOtpStep(1);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotSuccessMsg('');
    setForgotErrorMsg('');
    setShowForgotModal(true);
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setForgotErrorMsg('Please enter a valid email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await requestOtp(forgotEmail);
      if (res.success) {
        setForgotSuccessMsg(res.message);
        setOtpStep(2);
      } else {
        setForgotErrorMsg(res.message);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setForgotErrorMsg('Please enter the 6-digit OTP code sent to your email.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await verifyOtp(forgotEmail, otpCode);
      if (res.success) {
        setForgotSuccessMsg(res.message);
        setOtpStep(3);
      } else {
        setForgotErrorMsg(res.message);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password with Verified OTP
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMsg('');
    setForgotSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setForgotErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotErrorMsg('Passwords do not match! Please check and try again.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetPasswordWithOtp(forgotEmail, otpCode, newPassword);
      if (res.success) {
        setForgotSuccessMsg(res.message);
        setTimeout(() => {
          setShowForgotModal(false);
        }, 2000);
      } else {
        setForgotErrorMsg(res.message);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center login-bg-executive-titanium text-slate-900 dark:text-white overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y select-none">
      {/* Login splash is rendered globally in App.tsx via useUIStore.loginSplashActive */}

      {/* Option 2: Executive Titanium Architectural Blueprint Grid Overlay - Strictly Fixed & Non-Movable */}
      <div className="blueprint-grid-overlay" aria-hidden="true" />

      {/* Top-Right Theme Toggle Button */}
      <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 px-3 sm:px-3.5 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors cursor-pointer shadow-lg flex items-center gap-2 text-xs font-bold"
          title="Toggle Light / Dark Transparent Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          <span className="hidden xs:inline">{darkMode ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      {/* Main Content Area: Centered, Constant, Non-Movable */}
      <div className="my-auto w-full max-w-[400px] flex flex-col items-center px-4 py-8 relative z-10 shrink-0">
        {/* Brand Header — vertical logo + text */}
        <div className="flex flex-col items-center mb-5 text-center gap-3">
          {/* Square App Icon */}
          <div className="pms-logo-icon-wrap">
            <img
              src="/logo.png"
              alt="PMS Icon"
              className="pms-logo-icon"
            />
          </div>

          {/* Brand Text — static, no animation (animation only during login loading) */}
          <div className="pms-brand-text-block">
            <p className="pms-brand-line1">
              <span>Project Management</span>
            </p>
            <p className="pms-brand-line2">
              <span>System</span>
            </p>
          </div>
        </div>

        {/* Option 1: Obsidian Minimalist Glass Auth Card - Firmly Fixed & Constant */}
        <div className="w-full obsidian-glass-card p-5 sm:p-6 shadow-2xl relative">
          <div>
            <div className="text-center mb-3">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome Back
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sign in to your workspace
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl p-2.5 mb-3 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-3" autoComplete="off">
              {/* Hidden decoy fields to divert browser credential autofill */}
              <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />

              {/* Email Field with Obsidian Glass & Anti-Autofill Neutralization */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-300 pointer-events-none z-10" />
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="new-password"
                    {...registerLogin('email')}
                    className="obsidian-input w-full pl-10 pr-4 py-2.5 placeholder-slate-400 text-xs font-medium outline-none transition-colors"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 ml-1">{loginErrors.email.message as string}</p>
                )}
              </div>

              {/* Password Field with Obsidian Glass & Anti-Autofill Neutralization */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-300 pointer-events-none z-10" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="new-password"
                    {...registerLogin('password')}
                    className="obsidian-input w-full pl-10 pr-10 py-2.5 placeholder-slate-400 text-xs font-medium outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer z-10"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[10px] text-rose-500 font-medium mt-1 ml-1">{loginErrors.password.message as string}</p>
                )}
              </div>

              {/* Optional Expandable Workspace Code Field (For First-Time Onboarding Connection) */}
              {showWorkspaceInput && (
                <div className="overflow-hidden pt-0.5">
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder="Workspace Code (e.g. ABC001)"
                      autoComplete="off"
                      {...registerLogin('workspaceCode')}
                      className="obsidian-input w-full pl-10 pr-4 py-2 placeholder-slate-400 text-xs font-medium outline-none transition-colors uppercase placeholder:normal-case border-blue-500/30"
                    />
                  </div>
                  {loginErrors.workspaceCode && (
                    <p className="text-[10px] text-rose-500 font-medium mt-1 ml-1">{loginErrors.workspaceCode.message as string}</p>
                  )}
                </div>
              )}

              {/* Action Links: Workspace Code Toggle & Forgot Password Link */}
              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceInput(!showWorkspaceInput)}
                  className="text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{showWorkspaceInput ? 'Hide Workspace Code' : 'Have a Workspace Code?'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Option 1: Electric Blue-to-Violet Sign In Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="btn-obsidian-submit w-full py-2.5 px-4 font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading && !googleLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Option 1: Clean Minimalist Divider */}
            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300/80 dark:border-white/10" />
              </div>
              <div className="relative bg-white/90 dark:bg-[#0d101a] px-3 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest rounded-full border border-slate-200/80 dark:border-white/10">
                or
              </div>
            </div>

            {/* Option 1: Dedicated Google Sign In Button (ONLY Google Provider) */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="btn-google-sign-in w-full py-2.5 px-4 flex items-center justify-center gap-3 font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>

            {/* Requirement 2: New Organization Registration Option */}
            <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-white/10 text-center">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium">New Organization?</p>
              <button
                type="button"
                onClick={() => navigate('/register-organization')}
                className="w-full py-1.5 px-3 rounded-xl border border-blue-500/30 dark:border-blue-400/20 bg-blue-50/60 dark:bg-blue-500/10 hover:bg-blue-100/80 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Register Your Organization</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Requirement 10: Restricted Workspace Notice */}
            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Restricted Workspace &bull; Only administrator-approved accounts can log in.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Branding: In flow right below card, zero overlap */}
        <div className="mt-3 text-center pointer-events-none hidden sm:block">
          <p className="text-[9px] font-bold text-slate-400/80 dark:text-slate-500/80 tracking-[0.22em] uppercase">
            MANAGE PROJECTS &bull; BUILD BETTER TOMORROW
          </p>
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm touch-none overscroll-contain select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm max-h-[88vh] overflow-y-auto obsidian-glass-card rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-white/15 relative text-slate-900 dark:text-white modal-dialog-contain overscroll-contain"
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">6-Digit OTP Verification</p>
                </div>
              </div>

              {/* Steps Progress */}
              <div className="flex items-center justify-between mb-4 px-1">
                <span className={`text-[11px] font-bold ${otpStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>1. Email</span>
                <div className={`h-0.5 flex-1 mx-2 ${otpStep >= 2 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/10'}`} />
                <span className={`text-[11px] font-bold ${otpStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>2. OTP</span>
                <div className={`h-0.5 flex-1 mx-2 ${otpStep >= 3 ? 'bg-blue-600' : 'bg-slate-200 dark:bg-white/10'}`} />
                <span className={`text-[11px] font-bold ${otpStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>3. New Pass</span>
              </div>

              {forgotErrorMsg && (
                <div className="mb-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
                  {forgotErrorMsg}
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{forgotSuccessMsg}</span>
                </div>
              )}

              {/* Step 1: Send OTP */}
              {otpStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                    Enter your email to receive a 6-digit OTP code.
                  </p>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={forgotLoading}
                    className="obsidian-input w-full px-3.5 py-2.5 text-xs font-medium outline-none"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    {forgotLoading ? 'Sending OTP...' : 'Send OTP Code'}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {otpStep === 2 && (
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                    Enter the 6-digit OTP sent to <strong>{forgotEmail}</strong>.
                  </p>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={forgotLoading}
                    className="obsidian-input w-full px-3.5 py-2.5 text-center font-mono tracking-widest text-sm font-bold outline-none"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading || otpCode.length !== 6}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep(1)}
                    className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                  >
                    Resend Code
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {otpStep === 3 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-normal">
                    Enter your new password below.
                  </p>
                  <input
                    type="password"
                    required
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={forgotLoading}
                    className="obsidian-input w-full px-3.5 py-2.5 text-xs font-medium outline-none"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={forgotLoading}
                    className="obsidian-input w-full px-3.5 py-2.5 text-xs font-medium outline-none"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading || !newPassword || !confirmPassword}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    {forgotLoading ? 'Saving...' : 'Save New Password'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
