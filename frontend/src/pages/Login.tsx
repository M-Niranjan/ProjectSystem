import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Briefcase, Award, Eye, EyeOff, Shield, Compass, Sparkles, ArrowRight, CheckSquare } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

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
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'LEADER' | 'EMPLOYEE'>('LEADER');

  const { login, register, error, loading, clearError } = useAuthStore();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
    setValue
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    // Default pre-fill for Team Leader
    setValue('email', 'google.user@pm.com');
    setValue('password', 'password123');
  }, [setValue]);

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
    const success = await login(data, rememberMe);
    if (success) {
      resetLoginForm();
    }
  };

  const onSignupSubmit = async (data: any) => {
    const success = await register(data);
    if (success) {
      resetSignupForm();
    }
  };

  const toggleForm = () => {
    clearError();
    setIsLogin(!isLogin);
  };

  const handleSocialLogin = (platform: string) => {
    setSocialLoading(platform);
    setTimeout(async () => {
      // Simulate OAuth login by using a pre-seeded account
      const credentials = {
        email: platform === 'google' ? 'google.user@pm.com' : 'ms.user@pm.com',
        password: 'password123',
      };
      
      // Auto-register mock user if login fails (since it's a test environment)
      let success = await login(credentials, true);
      if (!success) {
        // Sign up first, then log in
        const mockSignup = {
          name: platform === 'google' ? 'Google Associate' : 'Microsoft Executive',
          email: credentials.email,
          password: credentials.password,
          role: 'ROLE_MANAGER',
          designation: 'Enterprise Architect',
          department: 'Product Strategy',
          experience: 6,
          skills: 'Agile, SaaS, Cloud, Spring Boot',
        };
        const signupSuccess = await register(mockSignup);
        if (signupSuccess) {
          await login(credentials, true);
        }
      }
      setSocialLoading(null);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden select-none">
      {/* Sunset Mountain Landscape Background Image matching reference image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat filter brightness-95 contrast-105"
        style={{
          backgroundImage: `url('/login_bg_wallpaper.jpg'), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop')`
        }}
      >
        {/* Soft natural overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/40 via-purple-950/20 to-blue-900/30 backdrop-blur-[2px]"></div>
        
        {/* Glowing glass sphere background accents matching reference image */}
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
          {/* Ambient glow orbs inside panel */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-purple-400/20 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none"></div>

          <div>
            {/* Top App Logo Badge */}
            <div className="w-12 h-12 rounded-2xl bg-white/60 dark:bg-white/15 backdrop-blur-md border border-white/50 flex items-center justify-center shadow-md mb-6">
              <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>

            {/* 3D Layered Glass Cards Graphic */}
            <div className="relative my-6 h-40 flex items-center justify-center">
              {/* Back Card */}
              <div className="absolute w-48 h-28 rounded-2xl bg-gradient-to-tr from-purple-500/30 to-indigo-500/30 backdrop-blur-md border border-white/40 transform -rotate-12 -translate-y-4 -translate-x-4 shadow-xl p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-white/60"></div>
                  <div className="w-10 h-1.5 rounded-full bg-white/30"></div>
                </div>
                <div className="h-8 bg-white/10 rounded-lg border border-white/20"></div>
              </div>

              {/* Middle Card */}
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

              {/* Front Card */}
              <div className="absolute w-56 h-32 rounded-2xl bg-white/60 dark:bg-white/20 backdrop-blur-xl border border-white/60 shadow-2xl p-3.5 flex flex-col justify-between transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                    <span className="text-[10px] font-black tracking-wider uppercase text-slate-900 dark:text-white">Analytics</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30">+84.2%</span>
                </div>
                <div className="flex items-end gap-2 h-14 pt-2">
                  <div className="w-3.5 bg-indigo-500/60 rounded-t h-[35%]"></div>
                  <div className="w-3.5 bg-purple-500/70 rounded-t h-[55%]"></div>
                  <div className="w-3.5 bg-violet-600/80 rounded-t h-[80%]"></div>
                  <div className="w-3.5 bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t h-[100%]"></div>
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
              <span className="text-purple-600 dark:text-purple-400">Project</span> <br />
              Management System
            </h1>
            <p className="text-xs text-slate-800 dark:text-slate-200 mt-2 font-medium leading-relaxed">
              Plan, track and manage your projects efficiently in one beautiful workspace.
            </p>
          </div>

          {/* Bottom Capsule Security Badge */}
          <div className="mt-6 self-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-100/60 dark:bg-purple-950/60 backdrop-blur-md border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-900 dark:text-purple-200 shadow-sm">
              <Shield className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
              <span>Secure • Fast • Reliable</span>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl text-slate-900 dark:text-white relative">
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                {isLogin ? 'Sign in to continue to your account' : 'Fill in your enterprise profile credentials'}
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

            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleLoginSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  {/* Role Selection Tabs */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 dark:bg-white/10 border border-slate-300/80 dark:border-white/20 backdrop-blur-md rounded-2xl mb-5 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleTab('LEADER');
                        setValue('email', 'google.user@pm.com');
                        setValue('password', 'password123');
                      }}
                      className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedRoleTab === 'LEADER'
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                          : 'text-slate-900 dark:text-slate-100 font-extrabold hover:bg-white/60 dark:hover:bg-white/20'
                      }`}
                    >
                      🧑💼 Team Leader
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleTab('EMPLOYEE');
                        setValue('email', 'ms.user@pm.com');
                        setValue('password', 'password123');
                      }}
                      className={`py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedRoleTab === 'EMPLOYEE'
                          ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25 scale-[1.02]'
                          : 'text-slate-900 dark:text-slate-100 font-extrabold hover:bg-white/60 dark:hover:bg-white/20'
                      }`}
                    >
                      👷 Employee
                    </button>
                  </div>

                  {/* Email Input Tile */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                      <input
                        type="email"
                        placeholder="john.doe@example.com"
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
                      <a href="#" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
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

                  {/* Sign In Button with Right Circle Arrow */}
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
                </motion.form>
              ) : (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleSignupSubmit(onSignupSubmit)}
                  className="space-y-3 max-h-[50vh] overflow-y-auto pr-1"
                >
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        {...registerSignup('name')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                      />
                    </div>
                    {signupErrors.name && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{signupErrors.name.message as string}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                      <input
                        type="email"
                        placeholder="name@company.com"
                        {...registerSignup('email')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                      />
                    </div>
                    {signupErrors.email && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{signupErrors.email.message as string}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        {...registerSignup('password')}
                        className="w-full pl-10 pr-10 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{signupErrors.password.message as string}</p>
                    )}
                  </div>

                  {/* Role & Designation */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Role</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                        <select
                          {...registerSignup('role')}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-purple-600 transition-all font-semibold text-xs appearance-none cursor-pointer shadow-sm"
                        >
                          <option className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white" value="ROLE_EMPLOYEE">Employee</option>
                          <option className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white" value="ROLE_MANAGER">Manager</option>
                          <option className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white" value="ROLE_ADMIN">Admin</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Designation</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                        <input
                          type="text"
                          placeholder="e.g. Designer"
                          {...registerSignup('designation')}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Department & Experience */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Department</label>
                      <div className="relative">
                        <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                        <input
                          type="text"
                          placeholder="e.g. Product"
                          {...registerSignup('department')}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Experience (Yrs)</label>
                      <div className="relative">
                        <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 dark:text-slate-300" />
                        <input
                          type="number"
                          placeholder="3"
                          {...registerSignup('experience')}
                          className="w-full pl-10 pr-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Key Skills */}
                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">Skills</label>
                    <input
                      type="text"
                      placeholder="React, CSS, SQL, Java"
                      {...registerSignup('skills')}
                      className="w-full px-4 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-purple-600 transition-all font-semibold text-xs shadow-sm"
                    />
                  </div>

                  {/* Sign Up Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/25 transform hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span></span>
                    <span className="text-center flex-1 font-black tracking-wide">{loading ? 'Creating...' : 'Create Account'}</span>
                    <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <div>
            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300 dark:border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-[11px] font-semibold">
                <span className="px-3 text-slate-700 dark:text-slate-300 bg-transparent">
                  or continue with
                </span>
              </div>
            </div>

            {/* Social Logins 3-Column Glass Grid matching reference mockup */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center py-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl hover:bg-white text-slate-900 dark:text-white font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50"
                title="Sign in with Google"
              >
                {socialLoading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
              </button>
              
              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('microsoft')}
                className="flex items-center justify-center py-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl hover:bg-white text-slate-900 dark:text-white font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50"
                title="Sign in with Microsoft"
              >
                {socialLoading === 'microsoft' ? (
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4.5 h-4.5" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M0 0h11v11H0z" />
                    <path fill="#81bc06" d="M12 0h11v11H12z" />
                    <path fill="#05a6f0" d="M0 12h11v11H0z" />
                    <path fill="#ffba08" d="M12 12h11v11H12z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                disabled={socialLoading !== null}
                onClick={() => handleSocialLogin('github')}
                className="flex items-center justify-center py-2.5 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl hover:bg-white text-slate-900 dark:text-white font-bold transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-105 disabled:opacity-50"
                title="Sign in with GitHub"
              >
                {socialLoading === 'github' ? (
                  <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5 fill-current text-black dark:text-white" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Toggle Footer Link */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={toggleForm}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline transition-colors cursor-pointer"
              >
                {isLogin ? (
                  <>Don't have an account? <span className="text-purple-600 dark:text-purple-400 font-bold underline ml-1">Sign up</span></>
                ) : (
                  <>Already have an account? <span className="text-purple-600 dark:text-purple-400 font-bold underline ml-1">Sign in</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
