import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, X, ShieldCheck } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { resolveAvatar } from '../../services/avatar';
import { normalizeRole, formatRoleName } from '../../services/authRoles';
import { useScrollLock } from '../../hooks/useScrollLock';

export default function SignOutConfirmModal() {
  const { signOutModalOpen, setSignOutModalOpen } = useUIStore();
  const { user, activeOrganization, logout } = useAuthStore();

  // Lock background scroll when modal is active
  useScrollLock(signOutModalOpen);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signOutModalOpen) {
        setSignOutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [signOutModalOpen, setSignOutModalOpen]);

  if (!signOutModalOpen) return null;

  const handleConfirmSignOut = () => {
    setSignOutModalOpen(false);
    useUIStore.getState().hideToast();
    // Flag for Login page to show "Signed out successfully" toast
    try { localStorage.setItem('pms_signed_out_success', '1'); } catch (_e) {}
    // logout() clears all state and redirects via window.location.hash
    logout();
  };

  const normRole = normalizeRole(user?.role);
  const roleDisplay = formatRoleName(user?.role, 'title');

  return createPortal(
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-modal-title"
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 touch-none overscroll-contain select-none"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setSignOutModalOpen(false)}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md cursor-pointer touch-none overscroll-none"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#0e131f] border border-slate-200/90 dark:border-slate-800/90 shadow-2xl rounded-3xl w-full max-w-md p-6 sm:p-7 space-y-5 relative z-10 modal-dialog-contain overscroll-contain"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setSignOutModalOpen(false)}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancel and close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Icon + Titles */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/10">
              <LogOut className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 pr-6">
              <h2 id="signout-modal-title" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Sign Out of TaskFlow?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                Are you sure you want to end your session? You can sign back in anytime with your credentials.
              </p>
            </div>
          </div>

          {/* Active Account Summary Capsule */}
          {user && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={resolveAvatar(user.profilePhoto, user.name || user.email, (user as any).gender)}
                  alt="Current user"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-blue-500/20 shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-black text-xs text-slate-900 dark:text-white truncate">
                    {user.name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 truncate">
                    {user.email}
                  </p>
                  {activeOrganization?.organizationName && (
                    <p className="text-[10px] text-blue-500 font-bold truncate mt-0.5">
                      🏢 {activeOrganization.organizationName}
                    </p>
                  )}
                </div>
              </div>

              <span className={`inline-flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase border whitespace-nowrap shrink-0 ${
                normRole === 'ROLE_ADMIN' 
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' 
                  : normRole === 'ROLE_MANAGER' 
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                {roleDisplay}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setSignOutModalOpen(false)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Stay Signed In
            </button>

            <button
              type="button"
              onClick={handleConfirmSignOut}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
