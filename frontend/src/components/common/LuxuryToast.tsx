import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function LuxuryToast() {
  const { toast, hideToast } = useUIStore();

  useEffect(() => {
    if (!toast) return;
    const duration = toast.duration || 2600;
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
          badgeText: 'text-rose-400',
          iconBg: 'bg-rose-500/15 border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.35)]',
          borderGlow: 'border-rose-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(244,63,94,0.2)]',
          pulseRing: 'border-rose-500/30',
        };
      case 'warning':
        return {
          title: 'Warning',
          icon: AlertTriangle,
          strokeWidth: 2.5,
          iconColor: 'text-amber-400',
          badgeText: 'text-amber-400',
          iconBg: 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.35)]',
          borderGlow: 'border-amber-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(245,158,11,0.2)]',
          pulseRing: 'border-amber-500/30',
        };
      case 'info':
        return {
          title: 'Notice',
          icon: Info,
          strokeWidth: 2.5,
          iconColor: 'text-cyan-400',
          badgeText: 'text-cyan-400',
          iconBg: 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.35)]',
          borderGlow: 'border-cyan-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_35px_rgba(6,182,212,0.2)]',
          pulseRing: 'border-cyan-500/30',
        };
      case 'success':
      default:
        return {
          title: 'Success',
          icon: Check,
          strokeWidth: 3.5,
          iconColor: 'text-emerald-400',
          badgeText: 'text-emerald-400',
          iconBg: 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.4)]',
          borderGlow: 'border-emerald-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.75),0_0_40px_rgba(16,185,129,0.25)]',
          pulseRing: 'border-emerald-500/30',
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
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 pointer-events-none select-none"
        >
          {/* Subtle Ambient Focus Tint (Click anywhere to dismiss immediately) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={hideToast}
            className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Luxury Centered HUD Card */}
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, scale: 0.82, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -12 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            onClick={hideToast}
            className={`relative pointer-events-auto w-full max-w-[290px] sm:max-w-[320px] rounded-3xl bg-slate-950/90 dark:bg-slate-950/95 backdrop-blur-2xl border ${theme.borderGlow} p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer`}
            role="status"
            aria-live="polite"
          >
            {/* Ambient Pulse Ripple Ring behind Icon */}
            <div className="relative flex items-center justify-center mb-4">
              <span className={`absolute w-20 h-20 rounded-full border ${theme.pulseRing} animate-ping opacity-30`} />
              <span className={`absolute w-24 h-24 rounded-full border ${theme.pulseRing} opacity-15`} />

              {/* Middle Symbol Container with Right Mark (✓) */}
              <motion.div
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.05 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 ${theme.iconBg} relative z-10`}
              >
                <Icon
                  className={`w-8 h-8 ${theme.iconColor}`}
                  strokeWidth={theme.strokeWidth}
                />
              </motion.div>
            </div>

            {/* Status Type Badge */}
            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.badgeText} mb-1.5`}>
              {theme.title}
            </span>

            {/* Notification Message */}
            <p className="text-sm font-bold text-white tracking-tight leading-relaxed max-w-[240px]">
              {toast.message}
            </p>

            {/* Micro subtle tap hint */}
            <span className="text-[10px] font-semibold text-slate-500 mt-3 opacity-60">
              Tap anywhere to dismiss
            </span>
          </motion.div>
        </aside>
      )}
    </AnimatePresence>,
    document.body
  );
}
