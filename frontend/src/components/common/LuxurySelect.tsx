import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeAbove?: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    placeAbove: false,
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Compute fixed viewport coordinates so dropdown is 100% immune to parent stacking contexts, backdrop-filter and overflow
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      // If trigger is detached or scrolled out of view completely, close
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        return;
      }

      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedDropdownHeight = Math.min(options.length * 40 + 16, 230);
      const placeAbove = spaceBelow < estimatedDropdownHeight && rect.top > estimatedDropdownHeight;

      setCoords({
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
        placeAbove,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, options.length]);

  // Close on outside click (checking both trigger container and portaled dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
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
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full max-w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50/90 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border transition-all cursor-pointer min-w-0 ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-white/10'
            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
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

      {/* Floating Dropdown Menu - rendered via Portal directly to body with z-[99999] so tables and headers never overlap it */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: coords.placeAbove ? 4 : -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: coords.placeAbove ? 4 : -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: coords.placeAbove ? undefined : `${coords.top}px`,
                  bottom: coords.placeAbove ? `${window.innerHeight - coords.top}px` : undefined,
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  zIndex: 99999,
                }}
                className={`bg-white/95 dark:bg-[#0c0e17]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/15 rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto overflow-x-hidden space-y-0.5 custom-scrollbar ${dropdownClassName}`}
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
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
