import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User as UserIcon, Briefcase, Award, Eye, EyeOff, Shield, Compass, Sparkles } from 'lucide-react';
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
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Floating Orbs */}
      <div className="absolute inset-0 z-0">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="noise-overlay"></div>
      </div>

      {/* Main Glass Card container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-xl p-8 md:p-10 relative z-10 overflow-hidden"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ rotate: -15, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg mb-4"
          >
            <Sparkles className="w-8 h-8 animate-pulse" />
          </motion.div>
          <h2 className="text-3xl font-black text-center tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
            PROLOGUE.io
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Next-gen Enterprise Project Hub
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 mb-6 text-sm font-semibold flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-ping"></span>
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
              className="space-y-5"
            >
              {/* Role Selection Tabs */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoleTab('LEADER');
                    setValue('email', 'google.user@pm.com');
                    setValue('password', 'password123');
                  }}
                  className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRoleTab === 'LEADER'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
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
                  className={`py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRoleTab === 'EMPLOYEE'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  👷 Employee
                </button>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    {...registerLogin('email')}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-xs text-red-500 font-semibold">{loginErrors.email.message as string}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Password
                  </label>
                  <a href="#" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerLogin('password')}
                    className="w-full pl-12 pr-12 py-3 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-xs text-red-500 font-semibold">{loginErrors.password.message as string}</p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500/20 bg-white/5 cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 text-sm font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
                  Remember me on this device
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Sign In to Dashboard'
                )}
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
              className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
            >
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    {...registerSignup('name')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  />
                </div>
                {signupErrors.name && (
                  <p className="text-xs text-red-500 font-semibold">{signupErrors.name.message as string}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    {...registerSignup('email')}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  />
                </div>
                {signupErrors.email && (
                  <p className="text-xs text-red-500 font-semibold">{signupErrors.email.message as string}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...registerSignup('password')}
                    className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupErrors.password && (
                  <p className="text-xs text-red-500 font-semibold">{signupErrors.password.message as string}</p>
                )}
              </div>

              {/* Role & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      {...registerSignup('role')}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm appearance-none cursor-pointer"
                    >
                      <option className="dark:bg-slate-800" value="ROLE_EMPLOYEE">Employee</option>
                      <option className="dark:bg-slate-800" value="ROLE_MANAGER">Manager</option>
                      <option className="dark:bg-slate-800" value="ROLE_ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Designation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Lead Designer"
                      {...registerSignup('designation')}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                    />
                  </div>
                  {signupErrors.designation && (
                    <p className="text-xs text-red-500 font-semibold">{signupErrors.designation.message as string}</p>
                  )}
                </div>
              </div>

              {/* Department & Experience */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Department
                  </label>
                  <div className="relative">
                    <Compass className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Product"
                      {...registerSignup('department')}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                    />
                  </div>
                  {signupErrors.department && (
                    <p className="text-xs text-red-500 font-semibold">{signupErrors.department.message as string}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Experience (Years)
                  </label>
                  <div className="relative">
                    <Award className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="3"
                      {...registerSignup('experience')}
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                    />
                  </div>
                  {signupErrors.experience && (
                    <p className="text-xs text-red-500 font-semibold">{signupErrors.experience.message as string}</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Key Skills (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="React, CSS, SQL, Java"
                  {...registerSignup('skills')}
                  className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-sm"
                />
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Create Enterprise Account'
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/50 dark:border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-100/50 dark:bg-slate-900/50 px-2 font-bold text-slate-400 backdrop-blur-md">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            disabled={socialLoading !== null}
            onClick={() => handleSocialLogin('google')}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            Google
          </button>
          
          <button
            type="button"
            disabled={socialLoading !== null}
            onClick={() => handleSocialLogin('microsoft')}
            className="flex items-center justify-center gap-2 py-2.5 border border-slate-200/50 dark:border-white/5 rounded-xl hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {socialLoading === 'microsoft' ? (
              <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-500 rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f35325" d="M0 0h11v11H0z" />
                <path fill="#81bc06" d="M12 0h11v11H12z" />
                <path fill="#05a6f0" d="M0 12h11v11H0z" />
                <path fill="#ffba08" d="M12 12h11v11H12z" />
              </svg>
            )}
            Microsoft
          </button>
        </div>

        {/* Toggle Footer */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={toggleForm}
            className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isLogin ? "Don't have an account? Create one" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
