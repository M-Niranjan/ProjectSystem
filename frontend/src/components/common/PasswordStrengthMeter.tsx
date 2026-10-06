import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Shield, Sparkles } from 'lucide-react';

export interface PasswordRule {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  bgBarClass: string;
  textColorClass: string;
  rules: PasswordRule[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const pass = password || '';
  
  const rules: PasswordRule[] = [
    { id: 'length', label: '8+ chars', met: pass.length >= 8 },
    { id: 'uppercase', label: 'Uppercase', met: /[A-Z]/.test(pass) },
    { id: 'lowercase', label: 'Lowercase', met: /[a-z]/.test(pass) },
    { id: 'number', label: 'Numbers (0-9)', met: /[0-9]/.test(pass) },
    { id: 'special', label: 'Special (!@#$...)', met: /[^A-Za-z0-9]/.test(pass) },
  ];

  if (!pass) {
    return {
      score: 0,
      label: '',
      colorClass: 'bg-slate-300 dark:bg-white/10',
      bgBarClass: 'bg-slate-200 dark:bg-white/10',
      textColorClass: 'text-slate-400',
      rules,
    };
  }

  const metCount = rules.filter((r) => r.met).length;

  let score: 0 | 1 | 2 | 3 | 4 = 1;
  let label = 'Weak';
  let colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
  let bgBarClass = 'bg-rose-500';
  let textColorClass = 'text-rose-500 dark:text-rose-400';

  if (pass.length < 6 || metCount <= 2) {
    score = 1;
    label = 'Weak';
    colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    bgBarClass = 'bg-rose-500';
    textColorClass = 'text-rose-500 dark:text-rose-400';
  } else if (metCount === 3) {
    score = 2;
    label = 'Fair';
    colorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    bgBarClass = 'bg-amber-500';
    textColorClass = 'text-amber-500 dark:text-amber-400';
  } else if (metCount === 4) {
    score = 3;
    label = 'Good';
    colorClass = 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]';
    bgBarClass = 'bg-blue-500';
    textColorClass = 'text-blue-500 dark:text-blue-400';
  } else if (metCount === 5) {
    score = 4;
    label = 'Strong & Secure';
    colorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
    bgBarClass = 'bg-emerald-500';
    textColorClass = 'text-emerald-500 dark:text-emerald-400';
  }

  return {
    score,
    label,
    colorClass,
    bgBarClass,
    textColorClass,
    rules,
  };
}

interface PasswordStrengthMeterProps {
  password?: string;
  showRules?: boolean;
  className?: string;
}

export default function PasswordStrengthMeter({
  password = '',
  showRules = true,
  className = '',
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -4 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`space-y-2 pt-1 ${className}`}
    >
      {/* 4 Segmented Strength Indicator Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-semibold">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            Password Strength:
          </span>
          <span className={`font-bold flex items-center gap-1 ${strength.textColorClass}`}>
            {strength.score === 4 && <Sparkles className="w-3 h-3" />}
            {strength.label}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {[1, 2, 3, 4].map((segIndex) => {
            const isFilled = strength.score >= segIndex;
            return (
              <div
                key={segIndex}
                className="h-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden transition-all duration-300"
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    isFilled ? strength.bgBarClass : 'w-0'
                  }`}
                  style={{ width: isFilled ? '100%' : '0%' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Requirements Checklist Pills */}
      {showRules && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {strength.rules.map((rule) => (
            <div
              key={rule.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                rule.met
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-white/5'
              }`}
            >
              {rule.met ? (
                <Check className="w-2.5 h-2.5 text-emerald-500" />
              ) : (
                <X className="w-2.5 h-2.5 opacity-40" />
              )}
              <span>{rule.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
