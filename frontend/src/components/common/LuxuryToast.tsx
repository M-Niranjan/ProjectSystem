import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function LuxuryToast() {
  const { toast, hideToast } = useUIStore();

  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 3500;
    const timer = setTimeout(() => {
      hideToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  const getTheme = () => {
    switch (toast?.type) {
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-500/20 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)]',
          borderGlow: 'border-rose-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(244,63,94,0.25)]',
          glowDot: 'bg-rose-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.35)]',
          borderGlow: 'border-amber-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(245,158,11,0.25)]',
          glowDot: 'bg-amber-400',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-cyan-400',
          iconBg: 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.35)]',
          borderGlow: 'border-cyan-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(6,182,212,0.25)]',
          glowDot: 'bg-cyan-400',
        };
      case 'success':
      default:
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.35)]',
          borderGlow: 'border-emerald-500/40 shadow-[0_12px_36px_rgba(0,0,0,0.7),0_0_24px_rgba(16,185,129,0.25)]',
          glowDot: 'bg-emerald-400',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <aside
      aria-label="Notifications"
      className="fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none w-[calc(100%-1.5rem)] max-w-md sm:w-auto px-2"
    >
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -28, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl sm:rounded-full bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-2xl border ${theme.borderGlow} text-white select-none`}
            role="status"
            aria-live="polite"
          >
            {/* Left: Glowing Squircle Icon Container */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border relative ${theme.iconBg}`}>
                <Icon className={`w-4 h-4 ${theme.iconColor}`} />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${theme.glowDot} animate-ping opacity-75`} />
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${theme.glowDot}`} />
              </div>

              {/* Message Content */}
              <div className="min-w-0 pr-1">
                <p className="text-xs sm:text-[13px] font-bold text-slate-100 truncate tracking-tight">
                  {toast.message}
                </p>
              </div>
            </div>

            {/* Right: Dismiss Action */}
            <button
              type="button"
              onClick={hideToast}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer ml-1"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>,
    document.body
  );
}
