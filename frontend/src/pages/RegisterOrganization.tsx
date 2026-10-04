import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Briefcase,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Sun,
  Moon,
  ChevronDown,
  Laptop,
  Heart,
  Landmark,
  GraduationCap,
  ShoppingBag,
  Factory,
  Palette,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

const registerOrgSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  industry: z.string().min(2, 'Please select or enter your organization industry'),
  organizationEmail: z.string().email('Please enter a valid organization email address'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z.string().email('Please enter a valid admin email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterOrgFormData = z.infer<typeof registerOrgSchema>;

export const INDUSTRY_OPTIONS = [
  {
    value: 'Software / IT',
    label: 'Software / IT',
    desc: 'SaaS, Cloud & Web Apps',
    icon: Laptop,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    value: 'Healthcare & Life Sciences',
    label: 'Healthcare & Life Sciences',
    desc: 'Medical, Biotech & Pharma',
    icon: Heart,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  {
    value: 'Finance & Fintech',
    label: 'Finance & Fintech',
    desc: 'Banking, Crypto & Capital',
    icon: Landmark,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    value: 'Education & EdTech',
    label: 'Education & EdTech',
    desc: 'E-Learning & Academia',
    icon: GraduationCap,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  {
    value: 'E-Commerce & Retail',
    label: 'E-Commerce & Retail',
    desc: 'Digital Store & Logistics',
    icon: ShoppingBag,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  {
    value: 'Manufacturing & Supply Chain',
    label: 'Manufacturing & Supply Chain',
    desc: 'Industrial & Hardware',
    icon: Factory,
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
  {
    value: 'Media & Design',
    label: 'Media & Design',
    desc: 'Creative Studio & Agency',
    icon: Palette,
    color: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
  },
  {
    value: 'Consulting & Professional Services',
    label: 'Consulting & Professional Services',
    desc: 'Advisory, Legal & Strategy',
    icon: Briefcase,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    value: 'Other',
    label: 'Other',
    desc: 'Specialized Enterprise Domain',
    icon: Sparkles,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
];

export default function RegisterOrganization() {
  const navigate = useNavigate();
  const { registerOrganization, loading, error, clearError } = useAuthStore();
  const { darkMode, toggleTheme } = useUIStore();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{
    id: string;
    code: string;
    name: string;
    industry: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Custom Industry Dropdown State
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterOrgFormData>({
    resolver: zodResolver(registerOrgSchema),
    defaultValues: {
      organizationName: '',
      industry: 'Software / IT',
      organizationEmail: '',
      adminName: '',
      adminEmail: '',
      password: '',
      confirmPassword: '',
    },
  });

  const selectedIndustry = watch('industry');
  const currentIndustryOption = INDUSTRY_OPTIONS.find((opt) => opt.value === selectedIndustry);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIndustryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = async (data: RegisterOrgFormData) => {
    clearError();
    const result = await registerOrganization({
      organizationName: data.organizationName.trim(),
      industry: data.industry.trim(),
      organizationEmail: data.organizationEmail.trim().toLowerCase(),
      adminName: data.adminName.trim(),
      adminEmail: data.adminEmail.trim().toLowerCase(),
      password: data.password,
      confirmPassword: data.confirmPassword,
    });

    if (result.success && result.organization) {
      setCreatedOrg(result.organization);
    }
  };

  const handleCopyCode = () => {
    if (createdOrg?.code) {
      navigator.clipboard.writeText(createdOrg.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleContinueToDashboard = () => {
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col items-center login-bg-executive-titanium text-slate-900 dark:text-white transition-colors duration-300 overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y select-none">
      {/* Executive Titanium Architectural Blueprint Grid Overlay (Identical to Login Page) */}
      <div className="blueprint-grid-overlay" aria-hidden="true" />

      {/* Top Navbar / Brand Header - Sticky and Stationary */}
      <div className="sticky top-0 left-0 right-0 w-full p-4 sm:p-6 flex items-center justify-between z-20 shrink-0 backdrop-blur-md bg-white/70 dark:bg-[#080a10]/70 border-b border-slate-200/50 dark:border-white/5">
        <Link to="/login" className="flex items-center gap-2.5 group">
          <img
            src="/logo.png"
            alt="TaskFlow Logo"
            className="w-7 h-7 object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Task<span className="text-blue-600 dark:text-blue-400">Flow</span>
              <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-sm border border-blue-500/20">
                MULTI-ORG
              </span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Enterprise Workspace</span>
          </div>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 px-3.5 rounded-2xl glass-panel text-slate-700 dark:text-slate-200 hover:border-blue-500/40 transition-colors shadow-lg flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          <span className="hidden sm:inline">{darkMode ? 'Dark Theme' : 'Light Theme'}</span>
        </button>
      </div>

      {/* Main Card Container - Fixed, Centered, Stationary */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-4 py-8 sm:py-12 shrink-0">
        <AnimatePresence mode="wait">
          {!createdOrg ? (
            /* Registration Form View */
            <motion.div
              key="register-form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-3xl obsidian-glass-card p-6 sm:p-8 pt-10 shadow-2xl shadow-slate-900/10 dark:shadow-black/50"
            >
              {/* 3D Holographic Cube Icon Badge */}
              <div className="flex justify-center -mt-16 sm:-mt-20 mb-3 select-none pointer-events-none">
                <div className="relative">
                  {/* Subtle clean ambient blue blur glow */}
                  <div className="absolute inset-0 bg-blue-500/15 rounded-3xl blur-xl transform scale-110" />
                  
                  {/* 3D Glass Isometric Cube Container */}
                  <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-blue-500/25 shadow-lg shadow-blue-500/10 flex items-center justify-center p-3">
                    {/* 3D Holographic Isometric Cube SVG */}
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                      <defs>
                        <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.8" />
                        </linearGradient>
                        <linearGradient id="cubeRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1e40af" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#172554" stopOpacity="0.85" />
                        </linearGradient>
                        <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#93c5fd" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>

                      {/* Orbit Ring */}
                      <ellipse cx="50" cy="50" rx="42" ry="18" fill="none" stroke="url(#coreGlow)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" transform="rotate(-18 50 50)" />

                      {/* Outer Isometric Cube Facets */}
                      {/* Top Face */}
                      <polygon points="50,16 80,32 50,48 20,32" fill="url(#cubeTop)" stroke="#93c5fd" strokeWidth="1" strokeOpacity="0.9" />
                      {/* Left Face */}
                      <polygon points="20,32 50,48 50,84 20,68" fill="url(#cubeLeft)" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.7" />
                      {/* Right Face */}
                      <polygon points="50,48 80,32 80,68 50,84" fill="url(#cubeRight)" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.7" />

                      {/* Inner Glowing Holographic Crystal */}
                      <polygon points="50,34 65,42 50,50 35,42" fill="#ffffff" fillOpacity="0.7" />
                      <polygon points="35,42 50,50 50,68 35,60" fill="#93c5fd" fillOpacity="0.8" />
                      <polygon points="50,50 65,42 65,60 50,68" fill="#60a5fa" fillOpacity="0.8" />

                      {/* Core light spark */}
                      <circle cx="50" cy="48" r="3" fill="#ffffff" filter="drop-shadow(0 0 6px #60a5fa)" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Header Title */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start New Workspace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Create Your Organization
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                  Register your organization workspace. You will become the founding Organization Administrator.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Organization Details Section */}
                <div className="space-y-3 pt-1">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    Organization Profile
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Organization Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Organization Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. ABC Technologies"
                          {...register('organizationName')}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                      {errors.organizationName && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.organizationName.message}</p>
                      )}
                    </div>

                    {/* Premium Custom Industry Dropdown */}
                    <div ref={dropdownRef} className="relative">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Industry <span className="text-rose-500">*</span>
                      </label>

                      {/* Hidden registered input for form submission */}
                      <input type="hidden" {...register('industry')} />

                      {/* Integrated Bar: Selector or Direct-Type Input in the SAME bar */}
                      {isCustomIndustry ? (
                        <div
                          className={`w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 rounded-xl border transition-all ${
                            industryDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/30 bg-white dark:bg-[#121624]'
                              : 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10 focus-within:ring-2 focus-within:ring-blue-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-1.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 text-blue-500 bg-blue-500/10 border-blue-500/20">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            </div>
                            <input
                              type="text"
                              ref={customInputRef}
                              value={selectedIndustry || ''}
                              onChange={(e) => setValue('industry', e.target.value, { shouldValidate: true })}
                              placeholder="Type your organization industry / domain..."
                              className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                              autoFocus
                            />
                          </div>

                          <button
                            type="button"
                            title="Choose from industry list"
                            onClick={() => setIndustryDropdownOpen(!industryDropdownOpen)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                industryDropdownOpen ? 'rotate-180 text-blue-500' : ''
                              }`}
                            />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="industry-dropdown-trigger"
                          onClick={() => setIndustryDropdownOpen(!industryDropdownOpen)}
                          className={`w-full flex items-center justify-between pl-3 pr-3 py-2 rounded-xl border transition-colors cursor-pointer text-left ${
                            industryDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/30 bg-white dark:bg-[#121624]'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#121624]/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {currentIndustryOption ? (
                              <>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${currentIndustryOption.color}`}>
                                  <currentIndustryOption.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                  {currentIndustryOption.label}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Select Industry</span>
                            )}
                          </div>

                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                              industryDropdownOpen ? 'rotate-180 text-blue-500' : ''
                            }`}
                          />
                        </button>
                      )}

                      {errors.industry && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.industry.message}</p>
                      )}

                      {/* Animated Glass Dropdown Panel */}
                      <AnimatePresence>
                        {industryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0c0f19]/95 backdrop-blur-2xl shadow-2xl max-h-64 overflow-y-auto space-y-1"
                            style={{
                              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)'
                            }}
                          >
                            {INDUSTRY_OPTIONS.map((opt) => {
                              const isOther = opt.value === 'Other';
                              const isSelected = isOther ? isCustomIndustry : (!isCustomIndustry && selectedIndustry === opt.value);
                              const IconComponent = opt.icon;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    if (isOther) {
                                      setIsCustomIndustry(true);
                                      setValue('industry', '', { shouldValidate: false });
                                      setIndustryDropdownOpen(false);
                                      setTimeout(() => customInputRef.current?.focus(), 60);
                                    } else {
                                      setIsCustomIndustry(false);
                                      setValue('industry', opt.value, { shouldValidate: true });
                                      setIndustryDropdownOpen(false);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer text-left group ${
                                    isSelected
                                      ? 'bg-blue-500/15 border border-blue-500/30'
                                      : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${opt.color}`}>
                                      <IconComponent className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className={`text-xs font-semibold block truncate ${
                                        isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'
                                      }`}>
                                        {isOther ? 'Other (Type in this bar)' : opt.label}
                                      </span>
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {isOther ? 'Type custom organization industry directly' : opt.desc}
                                      </span>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <Check className="w-4 h-4 text-blue-500 shrink-0 ml-2" />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Organization Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Organization Contact Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="e.g. contact@abc.com"
                        {...register('organizationEmail')}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                      />
                    </div>
                    {errors.organizationEmail && (
                      <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.organizationEmail.message}</p>
                    )}
                  </div>
                </div>

                {/* Administrator Profile Section */}
                <div className="space-y-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-500" />
                    Founding Administrator
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Admin Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Niranjan Mathapati"
                          {...register('adminName')}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                      {errors.adminName && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.adminName.message}</p>
                      )}
                    </div>

                    {/* Admin Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Admin Email (Login Account) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          placeholder="e.g. niranjan@abc.com"
                          {...register('adminEmail')}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                        />
                      </div>
                      {errors.adminEmail && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.adminEmail.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="At least 6 characters"
                          {...register('password')}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.password.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter password"
                          {...register('confirmPassword')}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-medium focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1">{errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition duration-200"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Provisioning Organization...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Organization</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Already have an account footer */}
              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already have a workspace?{' '}
                  <Link to="/login" className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Sign in to your workspace
                  </Link>
                </p>
              </div>
            </motion.div>
          ) : (
            /* Requirement 5: Success Celebration Screen */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl obsidian-glass-card border border-emerald-500/30 p-8 sm:p-10 shadow-2xl text-center"
            >
              {/* Celebration Icon */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Organization Created Successfully 🎉
              </h1>

              <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-2">
                {createdOrg.name}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Your workspace is ready. Share this human-readable Workspace Code with your employees and team leaders.
              </p>

              {/* Workspace Code Box */}
              <div className="my-6 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 max-w-sm mx-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Your Workspace Code
                </span>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-3xl font-black tracking-widest text-slate-900 dark:text-white bg-slate-200/60 dark:bg-white/10 px-4 py-1.5 rounded-xl border border-slate-300 dark:border-white/10">
                    {createdOrg.code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 text-slate-700 dark:text-white transition shadow-sm cursor-pointer"
                    title="Copy Workspace Code"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copiedCode && (
                  <p className="text-[11px] text-emerald-500 font-semibold mt-2">
                    Copied to clipboard!
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                  Use this code when signing in to your organization.
                </p>
              </div>

              {/* Continue to Admin Dashboard Button */}
              <button
                onClick={handleContinueToDashboard}
                className="w-full sm:w-auto sm:min-w-[280px] py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition duration-200 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Admin Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>You can also find this code later under Organization Settings &rarr; Organization Details</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
