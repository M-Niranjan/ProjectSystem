import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, User as UserIcon, Briefcase, Award, Eye, EyeOff, Shield, 
  Compass, Sparkles, ArrowRight, KeyRound, CheckCircle2, X, RefreshCw, ShieldCheck 
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { signInWithGoogle, signInWithEmailPassword, fetchFirestoreUserDoc, upsertFirestoreUserDoc } from '../services/firebase';
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
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('');
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');

  const { login, loginWithFirebase, register, requestOtp, verifyOtp, resetPasswordWithOtp, error, loading, clearError } = useAuthStore();

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
  }, [resetLoginForm]);

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

    console.log("Logged in UID:", user.uid);
    console.log("User email:", user.email);
    console.log("Firestore document path:", `users/${user.uid}`);

    // 3. Find user's document in Firestore 'users' collection using exact UID: doc(db, 'users', user.uid)
    const userData = await fetchFirestoreUserDoc(user.uid);

    // 4. If the document does not exist: deny access (do NOT open Employee Dashboard)
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
    console.log("User role from Firestore:", rawRole);

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

    // 7. Redirect based strictly on verified role
    const targetRoute = getDashboardPathForRole(normalizedRole);
    if (!targetRoute) {
      useAuthStore.setState({ error: 'Invalid user role. Please contact the administrator.', loading: false, user: null, token: null });
      return;
    }
    const roleEnum = normalizedRole;
    console.log("Redirecting to:", targetRoute);

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

  const handleSocialLogin = async (platform: string) => {
    setSocialLoading(platform);
    clearError();

    if (platform === 'google') {
      try {
        const result = await signInWithGoogle();
        const user = result.user;

        console.log("Authenticated UID (Google):", user.uid);
        console.log("Firestore Document Path:", `users/${user.uid}`);

        const userData = await fetchFirestoreUserDoc(user.uid);

        if (!userData) {
          console.log("Error: User document does not exist in Firestore users collection for UID:", user.uid);
          useAuthStore.setState({ 
            error: "User profile not found. Please contact the administrator.",
            loading: false 
          });
          setSocialLoading(null);
          return;
        }

        const firestoreRole = userData.role;
        console.log("Firestore user data:", userData);
        console.log("Firestore role:", firestoreRole);

        if (!firestoreRole) {
          console.log("Error: Role field missing in Firestore user document.");
          useAuthStore.setState({ 
            error: "Invalid user role. Please contact the administrator.",
            loading: false 
          });
          setSocialLoading(null);
          return;
        }

        const normalizedRole = normalizeRole(firestoreRole);
        const targetRoute = getDashboardPathForRole(normalizedRole);
        if (!normalizedRole || !targetRoute) {
          console.log("Error: Invalid or unmapped user role in Firestore:", firestoreRole);
          useAuthStore.setState({ 
            error: "Invalid user role. Please contact the administrator.",
            loading: false 
          });
          setSocialLoading(null);
          return;
        }

        const roleEnum = normalizedRole;
        console.log("Redirect route:", targetRoute);

        await loginWithFirebase({
          uid: user.uid,
          email: user.email,
          displayName: userData.name || user.displayName,
          photoURL: user.photoURL,
        }, rememberMe);

        setSocialLoading(null);
        navigate(targetRoute);
      } catch (err: any) {
        if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
          console.error('Google sign-in failed', err);
          useAuthStore.setState({ error: 'Google sign-in failed. Check Firebase configuration and try again.' });
        }
        setSocialLoading(null);
      }
      return;
    }

    setSocialLoading(null);
    useAuthStore.setState({ error: 'This sign-in method is not configured. Use email and password.' });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden select-none">
      {/* Background wallpaper */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat filter brightness-95 contrast-105"
        style={{
          backgroundImage: `url('/login_bg_wallpaper.jpg'), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-purple-950/20 to-blue-900/30 backdrop-blur-[2px]"></div>
        
        {/* Glowing glass sphere background accents */}
        <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full border border-white/40 bg-white/10 backdrop-blur-2xl shadow-xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-12 w-80 h-80 rounded-full border border-white/40 bg-white/10 backdrop-blur-xl shadow-xl pointer-events-none"></div>
        <div className="absolute top-6 -right-16 w-72 h-72 rounded-full border border-white/30 bg-white/10 backdrop-blur-2xl shadow-lg pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/15 blur-3xl pointer-events-none"></div>
      </div>

      {/* Main Split Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl relative z-10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 rounded-[32px] border border-white/40 shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
      >
        {/* Left Hero Showcase Panel */}
        <div className="lg:col-span-5 p-8 md:p-10 bg-slate-200/40 dark:bg-slate-900/50 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/30 flex flex-col justify-between relative overflow-hidden min-h-[460px]">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-purple-400/20 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

          <div>
            {/* Top App Logo Badge */}
            <div className="w-14 h-14 bg-transparent p-0 overflow-hidden mb-6 flex items-center justify-center">
              <img src="/logo.png" alt="Project Management System Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
            </div>

            {/* 3D Layered Glass Cards Graphic */}
            <div className="relative my-6 h-40 flex items-center justify-center">
              <div className="absolute w-48 h-28 rounded-2xl bg-gradient-to-tr from-purple-500/30 to-indigo-500/30 backdrop-blur-md border border-white/40 transform -rotate-12 -translate-y-4 -translate-x-4 shadow-xl p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/60"></div>
                  <div className="w-10 h-1.5 rounded-full bg-white/30"></div>
                </div>
                <div className="h-8 bg-white/10 rounded-lg border border-white/20"></div>
              </div>

              <div className="absolute w-52 h-30 rounded-2xl bg-gradient-to-tr from-indigo-500/40 to-blue-500/40 backdrop-blur-lg border border-white/50 transform -rotate-6 -translate-y-2 shadow-2xl p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-2 rounded-full bg-white/40"></div>
                  <div className="w-3.5 h-3.5 rounded-full bg-purple-400/50"></div>
                </div>
                <div className="flex items-end gap-1.5 h-14 pt-2">
                  <div className="w-2.5 bg-indigo-500/60 rounded-t h-[40%]"></div>
                  <div className="w-2.5 bg-purple-500/70 rounded-t h-[70%]"></div>
                  <div className="w-2.5 bg-blue-500/80 rounded-t h-[50%]"></div>
                  <div className="w-2.5 bg-purple-600 rounded-t h-[90%]"></div>
                </div>
              </div>

              <div className="absolute w-56 h-32 rounded-2xl bg-white/60 dark:bg-white/20 backdrop-blur-xl border border-white/60 shadow-2xl p-3.5 flex flex-col justify-between transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-900 dark:text-white">
                      Prologue System
                    </span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">Active</span>
                </div>
                <div className="flex items-end gap-2 h-14 pt-2">
                  <div className="w-3.5 bg-indigo-500/60 rounded-t h-[35%]"></div>
                  <div className="w-3.5 bg-purple-500/70 rounded-t h-[55%]"></div>
                  <div className="w-3.5 bg-violet-600/80 rounded-t h-[80%]"></div>
                  <div className="w-3.5 bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t h-[100%]"></div>
                </div>
              </div>
            </div>

            {/* Unified Headline & Subtitle */}
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
              <span className="text-purple-600 dark:text-purple-400">Enterprise</span> <br /> Project Management
            </h1>
            <p className="text-xs text-slate-800 dark:text-slate-200 mt-2 font-medium leading-relaxed">
              Unified workspace portal for global project administration, team tracking, and agile deliverables.
            </p>
          </div>

          {/* Bottom Security Badge */}
          <div className="mt-6 self-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/60 dark:bg-purple-950/60 backdrop-blur-md border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-900 dark:text-purple-200 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
              <span>SECURE AUTHENTICATION</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl text-slate-900 dark:text-white relative">
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Sign In
              </h2>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                Enter your provisioned email address and password to access your dashboard
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-rose-500/20 border border-rose-500/30 text-rose-800 dark:text-rose-200 rounded-xl p-3.5 mb-5 text-xs font-bold flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping"></span>
                {error}
              </motion.div>
            )}

            <form
              onSubmit={handleLoginSubmit(onLoginSubmit)}
              className="space-y-4"
              autoComplete="off"
            >
              {/* Hidden dummy fields to block browser autofill */}
              <input type="text" name="prevent_autofill_email" id="prevent_autofill_email" value="" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="off" />
              <input type="password" name="prevent_autofill_password" id="prevent_autofill_password" value="" style={{ display: 'none' }} tabIndex={-1} readOnly autoComplete="off" />

              {/* Email Input Tile */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                  Email Address
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="off"
                    {...registerLogin('email')}
                    className="w-full pl-11 pr-4 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">{loginErrors.email.message as string}</p>
                )}
              </div>

              {/* Password Input Tile */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    {...registerLogin('password')}
                    className="w-full pl-11 pr-11 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">{loginErrors.password.message as string}</p>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center pt-1">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500/20 bg-white cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 text-xs font-extrabold text-slate-900 dark:text-slate-100 cursor-pointer">
                  Remember me
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/25 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer flex items-center justify-between mt-2"
              >
                <span></span>
                <span className="text-center flex-1 font-black tracking-wide">{loading ? 'Signing In...' : 'Sign In'}</span>
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10 text-center">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Account provisioning is restricted to Authorized System Administrators & Team Leaders.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password 3-Step 6-Digit OTP Modal Overlay */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-white/40 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-2xl relative"
            >
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Reset Password</h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>6-Digit OTP Verification</span>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-5 px-2">
                <div className={`flex items-center gap-1 text-xs font-black ${otpStep >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">1</span>
                  <span>Email</span>
                </div>
                <div className={`h-0.5 flex-1 mx-2 ${otpStep >= 2 ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                <div className={`flex items-center gap-1 text-xs font-black ${otpStep >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">2</span>
                  <span>OTP</span>
                </div>
                <div className={`h-0.5 flex-1 mx-2 ${otpStep >= 3 ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                <div className={`flex items-center gap-1 text-xs font-black ${otpStep >= 3 ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">3</span>
                  <span>New Pass</span>
                </div>
              </div>

              {forgotErrorMsg && (
                <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-start gap-2">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 animate-ping"></span>
                  <span>{forgotErrorMsg}</span>
                </div>
              )}

              {forgotSuccessMsg && (
                <div className="mb-4 p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>{forgotSuccessMsg}</span>
                </div>
              )}

              {/* STEP 1: Enter Email */}
              {otpStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    Enter your registered email address. We will send a 6-digit OTP verification code directly to your email inbox.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        className="w-full pl-11 pr-4 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Send 6-Digit OTP Code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Enter 6-Digit OTP */}
              {otpStep === 2 && (
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    Check your email inbox for <strong className="text-purple-600 dark:text-purple-400">{forgotEmail}</strong> and enter the 6-digit OTP code below.
                  </p>
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        disabled={forgotLoading}
                        className="w-full pl-11 pr-4 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-black text-center text-base letter-spacing-2 tracking-widest shadow-sm disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={forgotLoading || otpCode.length !== 6}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify 6-Digit OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-extrabold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend OTP Code</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Enter New Password */}
              {otpStep === 3 && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                    OTP Verified! Please enter your new password to complete the reset process.
                  </p>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={forgotLoading}
                        className="w-full pl-11 pr-11 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={forgotLoading}
                        className="w-full pl-11 pr-11 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      disabled={forgotLoading || !newPassword || !confirmPassword}
                      className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-purple-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Resetting Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save & Update Password</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
