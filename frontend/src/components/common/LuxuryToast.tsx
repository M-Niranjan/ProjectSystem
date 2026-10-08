import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function LuxuryToast() {
  const { toast, hideToast } = useUIStore();

  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 3200;
    const timer = setTimeout(() => {
      hideToast();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  const getTheme = () => {
    switch (toast?.type) {
      case 'error':
        return {
          title: 'Error',
          icon: X,
          strokeWidth: 3,
          iconColor: 'text-rose-400',
          badgeText: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
          iconBg: 'bg-rose-500/20 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.4)]',
          borderGlow: 'border-rose-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(244,63,94,0.25)]',
          dotPulse: 'bg-rose-400',
        };
      case 'warning':
        return {
          title: 'Warning',
          icon: AlertTriangle,
          strokeWidth: 2.5,
          iconColor: 'text-amber-400',
          badgeText: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
          iconBg: 'bg-amber-500/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
          borderGlow: 'border-amber-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(245,158,11,0.25)]',
          dotPulse: 'bg-amber-400',
        };
      case 'info':
        return {
          title: 'Notice',
          icon: Info,
          strokeWidth: 2.5,
          iconColor: 'text-cyan-400',
          badgeText: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
          iconBg: 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.4)]',
          borderGlow: 'border-cyan-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(6,182,212,0.25)]',
          dotPulse: 'bg-cyan-400',
        };
      case 'success':
      default:
        return {
          title: 'Success',
          icon: Check,
          strokeWidth: 3.5,
          iconColor: 'text-emerald-400',
          badgeText: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
          iconBg: 'bg-emerald-500/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.45)]',
          borderGlow: 'border-emerald-500/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_25px_rgba(16,185,129,0.25)]',
          dotPulse: 'bg-emerald-400',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {toast && (
        <aside
          aria-label="Notifications"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none select-none max-w-[94vw] sm:max-w-2xl"
        >
          {/* Luxury Single-Line Header HUD Pill */}
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -26, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            onClick={hideToast}
            className={`pointer-events-auto px-4 py-2 sm:py-2.5 rounded-full bg-slate-950/92 dark:bg-[#070913]/95 backdrop-blur-2xl border ${theme.borderGlow} text-white shadow-2xl flex items-center justify-between gap-3 cursor-pointer group transition-transform active:scale-[0.99]`}
            role="status"
            aria-live="polite"
          >
            {/* Left: Glowing Icon Pill + Tag + Message in a Single Line */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Micro Status Icon Container */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${theme.iconBg}`}>
                <Icon
                  className={`w-3.5 h-3.5 ${theme.iconColor}`}
                  strokeWidth={theme.strokeWidth}
                />
              </div>

              {/* Status Tag Badge */}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${theme.badgeText}`}>
                {theme.title}
              </span>

              {/* Subtle Divider */}
              <span className="w-px h-3 bg-white/20 shrink-0 hidden sm:inline-block" />

              {/* Single-Line Message Text */}
              <p className="text-xs font-bold text-slate-100 dark:text-slate-100 tracking-tight whitespace-nowrap truncate min-w-0">
                {toast.message}
              </p>
            </div>

            {/* Right: Dismiss Action */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hideToast();
              }}
              className="w-5 h-5 rounded-full hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0 ml-1.5 cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>,
    document.body
  );
}

