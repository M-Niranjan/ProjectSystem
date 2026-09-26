import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface LuxurySelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

interface LuxurySelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: LuxurySelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
  icon?: React.ReactNode;
  id?: string;
}

export default function LuxurySelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  icon,
  id,
}: LuxurySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(String(val));
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      id={id}
      className={`relative w-full max-w-full text-left select-none ${className}`}
    >
      {/* Trigger Button - strictly 100% width of parent, zero overflow */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full max-w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border transition-all cursor-pointer min-w-0 ${
          isOpen
            ? 'border-indigo-500/70 ring-2 ring-indigo-500/20 bg-white/10 dark:bg-white/10'
            : 'border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/15'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {selectedOption?.icon ? (
            <span className="flex-shrink-0">{selectedOption.icon}</span>
          ) : icon ? (
            <span className="flex-shrink-0 text-slate-400">{icon}</span>
          ) : null}

          <div className="min-w-0 flex-1 text-left truncate">
            {selectedOption ? (
              <span className="text-slate-800 dark:text-white font-bold truncate block">
                {selectedOption.label}
                {selectedOption.subLabel && (
                  <span className="ml-1.5 text-[10px] font-medium text-slate-400 dark:text-zinc-400 opacity-80">
                    ({selectedOption.subLabel})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-zinc-500 font-medium truncate block">
                {placeholder}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu - strictly bounded within container width (left-0 right-0 w-full max-w-full) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute left-0 right-0 top-full mt-1.5 w-full max-w-full z-50 bg-white/95 dark:bg-[#0c0e17]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto overflow-x-hidden space-y-0.5 custom-scrollbar ${dropdownClassName}`}
            role="listbox"
          >
            {options.length === 0 ? (
              <div className="px-3 py-2 text-center text-xs text-slate-400 italic">
                No options available
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full max-w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer min-w-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-700 dark:text-zinc-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      {opt.icon && <span className="flex-shrink-0">{opt.icon}</span>}
                      <div className="min-w-0 flex-1 truncate">
                        <span className="truncate block font-semibold leading-tight">
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span
                            className={`text-[10px] truncate block leading-tight mt-0.5 ${
                              isSelected
                                ? 'text-indigo-100 opacity-90'
                                : 'text-slate-400 dark:text-zinc-400'
                            }`}
                          >
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                      {opt.badge && (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                            opt.badgeColor || 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
