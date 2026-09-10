import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, KeyRound, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { verifyResetCode } from '../services/firebase';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get('oobCode') || searchParams.get('code') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [verifying, setVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [invalidLinkErr, setInvalidLinkErr] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { confirmResetPassword } = useAuthStore();

  useEffect(() => {
    async function checkCode() {
      if (!oobCode) {
        setVerifying(false);
        setInvalidLinkErr('This password reset link is missing or invalid. Please request a new password reset link.');
        return;
      }
      try {
        const email = await verifyResetCode(oobCode);
        setUserEmail(email);
        setVerifying(false);
      } catch (err: any) {
        console.error('Firebase password reset link verification failed:', err);
        setVerifying(false);
        setInvalidLinkErr('This password reset link is invalid or has expired. Please request a new password reset link.');
      }
    }
    checkCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match!');
      return;
    }

    if (!userEmail) {
      setErrorMsg('This reset link must be verified before your password can be changed.');
      return;
    }

    setLoading(true);
    try {
      const result = await confirmResetPassword(oobCode, newPassword);
      if (result.success) {
        setSuccessMsg(result.message);
      } else {
        setErrorMsg(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 overflow-hidden select-none bg-slate-950">
      {/* Background wallpaper */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105"
        style={{
          backgroundImage: `url('/login_bg_wallpaper.jpg'), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop')`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/70 via-purple-950/40 to-blue-950/50 backdrop-blur-[3px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10 overflow-hidden rounded-[32px] border border-white/40 shadow-[0_32px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 p-8 md:p-10 text-slate-900 dark:text-white"
      >
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-white/40 flex items-center justify-center shadow-xl mb-6 mx-auto">
          <KeyRound className="w-8 h-8 text-white" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Set New Password
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {userEmail ? `Resetting password for ${userEmail}` : 'Create a strong, secure password for your account'}
          </p>
        </div>

        {verifying ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest animate-pulse">Verifying reset link...</p>
          </div>
        ) : invalidLinkErr ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-3 text-left">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-rose-500" />
              <span>{invalidLinkErr}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-xs rounded-2xl shadow-xl hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer"
            >
              Return to Login Page
            </button>
          </div>
        ) : successMsg ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-3 text-left">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs rounded-2xl shadow-xl hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Back to Login & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping"></span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl text-slate-900 dark:text-white outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-500/20 transition-all font-semibold text-xs shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-11 pr-11 py-3 bg-white/95 dark:bg-slate-900/90 border rounded-2xl text-slate-900 dark:text-white outline-none font-semibold text-xs transition-all shadow-sm ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-rose-500/70 focus:ring-2 focus:ring-rose-500/20'
                      : confirmPassword && confirmPassword === newPassword
                      ? 'border-emerald-500/70 focus:ring-2 focus:ring-emerald-500/20'
                      : 'border-slate-200 dark:border-white/20 focus:border-purple-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
                <p className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 mt-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs shadow-xl shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
