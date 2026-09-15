import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, User as UserIcon, Briefcase, Award, Eye, EyeOff, Shield, 
  ArrowRight, KeyRound, CheckCircle2, X, RefreshCw, ShieldCheck, AlertCircle,
  Sun, Moon
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { signInWithGoogle, signInWithEmailPassword, fetchFirestoreUserDoc } from '../services/firebase';
import { getDashboardPathForRole, normalizeRole } from '../services/authRoles';

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_EMPLOYEE']),
  designation: z.string().min(2, 'Designation is required'),
  department: z.string().min(2, 'Department is required'),
  experience: z.preprocess((val) => Number(val), z.number().min(0, 'Experience must be positive')),
  skills: z.string().optional(),
});

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Forgot password OTP step modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');

  const { loginWithFirebase, register, requestOtp, verifyOtp, resetPasswordWithOtp, error, loading, clearError } = useAuthStore();
  const { darkMode, toggleTheme } = useUIStore();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
    getValues
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  React.useEffect(() => {
    resetLoginForm({ email: '', password: '' });
    clearError();
  }, [resetLoginForm, clearError]);

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
    reset: resetSignupForm
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'ROLE_EMPLOYEE',
    }
  });

  const onLoginSubmit = async (data: any) => {
    clearError();
    const email = (data.email || '').trim();
    const password = (data.password || '').trim();

    // 1. Authenticate with Firebase Authentication using signInWithEmailAndPassword
    let userCredential;
    try {
      userCredential = await signInWithEmailPassword(email, password);
    } catch (firebaseErr: any) {
      console.warn("Firebase Auth error:", firebaseErr?.code || firebaseErr?.message);
      let errorMsg = 'Invalid email or password! Please check your credentials.';
      if (
        firebaseErr?.code === 'auth/user-not-found' ||
        firebaseErr?.code === 'auth/wrong-password' ||
        firebaseErr?.code === 'auth/invalid-credential'
      ) {
        errorMsg = 'Invalid email or password! Please check your credentials.';
      } else if (firebaseErr?.code === 'auth/too-many-requests') {
        errorMsg = 'Access to this account has been temporarily disabled due to many failed login attempts. Please try again later or reset your password.';
      } else if (firebaseErr?.code === 'auth/network-request-failed') {
        errorMsg = 'Network connection error. Please check your internet connection.';
      } else if (firebaseErr?.message) {
        errorMsg = firebaseErr.message;
      }
      useAuthStore.setState({ error: errorMsg, loading: false });
      return;
    }

    // 2. Extract authenticated Firebase User and exact UID
    const user = userCredential.user;
    if (!user || !user.uid) {
      useAuthStore.setState({ error: "Authentication failed. Could not retrieve user ID.", loading: false });
      return;
    }

    // 3. Find user's document in Firestore 'users' collection using exact UID: doc(db, 'users', user.uid)
    const userData = await fetchFirestoreUserDoc(user.uid);

    // 4. If the document does not exist: deny access
    if (!userData) {
      console.warn("Firestore document not found: users/" + user.uid);
      useAuthStore.setState({ 
        error: "User profile not found. Please contact your administrator.", 
        loading: false,
        user: null,
        token: null
      });
      return;
    }

    // 5. Read the role field strictly from that document
    const rawRole = (userData as any).role ?? (userData as any).roleCode;
    const normalizedRole = normalizeRole(rawRole);

    if (!normalizedRole) {
      console.warn("Invalid user role found in Firestore:", rawRole);
      useAuthStore.setState({ 
        error: "Invalid user role. Please contact your administrator.", 
        loading: false,
        user: null,
        token: null
      });
      return;
    }

    // 6. Redirect based strictly on verified role
    const targetRoute = getDashboardPathForRole(normalizedRole);
    if (!targetRoute) {
      useAuthStore.setState({ error: 'Invalid user role. Please contact the administrator.', loading: false, user: null, token: null });
      return;
    }
    const roleEnum = normalizedRole;

    const loggedInUser = {
      id: user.uid,
      email: user.email || email,
      name: (userData as any).name || (userData as any).displayName || user.displayName || email.split('@')[0],
      role: roleEnum,
      designation: (userData as any).designation || (roleEnum === 'ROLE_ADMIN' ? 'System Administrator' : roleEnum === 'ROLE_MANAGER' ? 'Project Lead' : 'Software Engineer'),
      department: (userData as any).department || (roleEnum === 'ROLE_ADMIN' ? 'Executive' : roleEnum === 'ROLE_MANAGER' ? 'Management' : 'Engineering'),
      experience: (userData as any).experience || 5,
      skills: (userData as any).skills || '',
      createdAt: (userData as any).createdAt || new Date().toISOString(),
    };

    const token = await user.getIdToken();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', token);
    if (rememberMe) {
      sessionStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    useAuthStore.setState({ user: loggedInUser as any, token, loading: false, error: null });
    resetLoginForm();
    navigate(targetRoute, { replace: true });
  };

  const onSignupSubmit = async (data: any) => {
    clearError();
    const success = await register(data);
    if (success) {
      resetSignupForm();
      const currentUser = useAuthStore.getState().user;
      const userRole = currentUser?.role;
      const normalizedUserRole = normalizeRole(userRole);
      if (normalizedUserRole === 'ROLE_ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (normalizedUserRole === 'ROLE_MANAGER') {
        navigate('/team-lead/dashboard', { replace: true });
      } else if (normalizedUserRole === 'ROLE_EMPLOYEE') {
        navigate('/employee/dashboard', { replace: true });
      } else {
        useAuthStore.setState({ error: "Invalid user role. Please contact the administrator." });
      }
    }
  };

  const toggleForm = () => {
    clearError();
    setIsLogin(!isLogin);
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
    <div className="relative min-h-screen flex flex-col justify-between items-center py-10 px-4 bg-white dark:bg-black text-slate-900 dark:text-white overflow-hidden select-none transition-colors duration-300">
      {/* Top-Right Theme Toggle Button */}
      <div className="absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 px-3.5 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 hover:scale-105 transition-all cursor-pointer shadow-lg flex items-center gap-2 text-xs font-bold"
          title="Toggle Light / Dark Transparent Theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          <span>{darkMode ? 'Dark Theme' : 'Light Theme'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {/* Ascending 3-Bar Logo */}
          <div className="flex items-end gap-1.5 h-12 mb-3">
            <div className="w-3.5 h-6 rounded-md bg-gradient-to-t from-sky-400 to-blue-500 shadow-sm" />
            <div className="w-3.5 h-9 rounded-md bg-gradient-to-t from-blue-500 to-indigo-600 shadow-sm" />
            <div className="w-3.5 h-12 rounded-md bg-gradient-to-t from-indigo-600 to-violet-600 shadow-sm" />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Task<span className="text-blue-600 dark:text-blue-400">Flow</span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            Project Management System
          </p>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.22em] mt-2 uppercase">
            PLAN &bull; COLLABORATE &bull; ACHIEVE
          </p>
        </div>

        {/* Auth Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full glass-card-login rounded-3xl p-8 sm:p-9 shadow-2xl transition-all border border-slate-200/80 dark:border-white/15"
        >
          {isLogin ? (
            /* ================= SIGN IN FORM ================= */
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sign in to your account
                </p>
              </div>

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

              <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
                {/* Email Field */}
                <div>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Email address"
                      autoComplete="email"
                      {...registerLogin('email')}
                      className="w-full pl-10 pr-4 py-3 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all backdrop-blur-md"
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 ml-1">{loginErrors.email.message as string}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="current-password"
                      {...registerLogin('password')}
                      className="w-full pl-10 pr-10 py-3 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="text-[11px] text-rose-500 font-medium mt-1 ml-1">{loginErrors.password.message as string}</p>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
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

              {/* Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-white/10" />
                </div>
                <span className="relative px-3 bg-transparent text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
              </div>

              {/* Toggle to Sign Up */}
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          ) : (
            /* ================= SIGN UP FORM ================= */
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Create Account
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Get started with TaskFlow
                </p>
              </div>

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

              <form onSubmit={handleSignupSubmit(onSignupSubmit)} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    {...registerSignup('name')}
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 backdrop-blur-md"
                  />
                  {signupErrors.name && (
                    <p className="text-[10px] text-rose-500 font-medium mt-0.5">{signupErrors.name.message as string}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    {...registerSignup('email')}
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 backdrop-blur-md"
                  />
                  {signupErrors.email && (
                    <p className="text-[10px] text-rose-500 font-medium mt-0.5">{signupErrors.email.message as string}</p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password (min. 6 characters)"
                    {...registerSignup('password')}
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 backdrop-blur-md"
                  />
                  {signupErrors.password && (
                    <p className="text-[10px] text-rose-500 font-medium mt-0.5">{signupErrors.password.message as string}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <select
                      {...registerSignup('role')}
                      className="w-full px-3 py-2.5 bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:border-blue-500"
                    >
                      <option value="ROLE_EMPLOYEE">Employee</option>
                      <option value="ROLE_MANAGER">Manager</option>
                      <option value="ROLE_ADMIN">Admin</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Designation"
                      {...registerSignup('designation')}
                      className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Department"
                      {...registerSignup('department')}
                      className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Years Exp"
                      {...registerSignup('experience')}
                      className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer mt-2"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>

              <div className="text-center mt-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleForm}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer ml-1"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 text-center mt-8">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.22em] uppercase">
          MANAGE PROJECTS &bull; BUILD BETTER TOMORROW
        </p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="w-12 h-px bg-slate-300 dark:bg-white/10" />
          <div className="flex items-end gap-1 h-3.5">
            <div className="w-1 h-2 rounded-xs bg-blue-400" />
            <div className="w-1 h-2.5 rounded-xs bg-blue-600" />
            <div className="w-1 h-3.5 rounded-xs bg-indigo-600" />
          </div>
          <div className="w-12 h-px bg-slate-300 dark:bg-white/10" />
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm glass-panel rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-white/15 relative text-slate-900 dark:text-white"
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
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
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
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
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-center font-mono tracking-widest text-sm font-bold outline-none focus:border-blue-500 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading || otpCode.length !== 6}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpStep(1)}
                    className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={forgotLoading}
                    className="w-full px-3.5 py-2.5 bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-white text-xs font-medium outline-none focus:border-blue-500 backdrop-blur-md"
                  />
                  <button
                    type="submit"
                    disabled={forgotLoading || !newPassword || !confirmPassword}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
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
