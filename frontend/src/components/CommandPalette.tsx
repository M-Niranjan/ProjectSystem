import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Sun, Moon, Mic, Play, Settings, Sparkles, User, Users } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  action: () => void;
  category: 'Navigation' | 'Actions';
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setView, toggleTheme, setVoiceOverlay, setPomodoroTimer } = useUIStore();

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dash', title: 'Go to Dashboard', subtitle: 'View main workspace analytics', icon: Compass, category: 'Navigation', action: () => setView('dashboard') },
    { id: 'nav-proj', title: 'Go to Projects', subtitle: 'Manage all enterprise projects', icon: Compass, category: 'Navigation', action: () => setView('projects') },
    { id: 'nav-kanb', title: 'Go to Kanban Board', subtitle: 'Drag & drop tasks between columns', icon: Compass, category: 'Navigation', action: () => setView('boards') },
    { id: 'nav-cal', title: 'Go to Calendar', subtitle: 'Review task milestones and scheduling', icon: Compass, category: 'Navigation', action: () => setView('calendar') },
    { id: 'nav-time', title: 'Go to Gantt Timeline', subtitle: 'View project schedule Gantt chart', icon: Compass, category: 'Navigation', action: () => setView('timeline') },
    { id: 'nav-team', title: 'Go to Team Hub', subtitle: 'Review member assignments and roles', icon: Users, category: 'Navigation', action: () => setView('teams') },
    { id: 'nav-prof', title: 'Go to Profile Resume', subtitle: 'View your completed achievements and logs', icon: User, category: 'Navigation', action: () => setView('profile') },
    { id: 'nav-sett', title: 'Go to Hub Settings', subtitle: 'Manage workspace configuration options', icon: Settings, category: 'Navigation', action: () => setView('settings') },
    // Actions
    { id: 'act-theme', title: 'Toggle Light/Dark Mode', subtitle: 'Switch the workspace appearance theme', icon: Sun, category: 'Actions', action: () => toggleTheme() },
    { id: 'act-voice', title: 'Trigger Voice Commands', subtitle: 'Activate Web Speech controller', icon: Mic, category: 'Actions', action: () => setVoiceOverlay(true) },
    { id: 'act-timer', title: 'Open Focus Pomodoro', subtitle: 'Start a 25 minute focus session', icon: Play, category: 'Actions', action: () => setPomodoroTimer(true) }
  ];

  // Listen for Ctrl+K and custom navbar events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleOpenEvent = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search-palette', handleOpenEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search-palette', handleOpenEvent);
    };
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
    }
  }, [isOpen]);

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 select-none">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
          ></motion.div>

          {/* Palette box */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-lg shadow-2xl overflow-hidden relative border border-slate-200/50 dark:border-white/10"
          >
            {/* Search Input */}
            <div className="p-4 border-b border-slate-200/50 dark:border-white/5 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a workspace command or page name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-white placeholder-slate-400 font-medium text-sm"
              />
              <span className="text-[10px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded">
                ESC
              </span>
            </div>

            {/* Commands List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-2">
                  <Sparkles className="w-6 h-6 text-slate-300 animate-spin-slow" />
                  No matching shortcuts found.
                </div>
              ) : (
                filtered.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border-l-4 border-blue-500 bg-slate-100 dark:bg-white/5'
                          : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">{cmd.title}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{cmd.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer tips */}
            <div className="p-3 bg-slate-100/50 dark:bg-slate-900/40 border-t border-slate-200/50 dark:border-white/5 text-[9px] font-bold text-slate-400 flex items-center justify-between px-4">
              <span className="flex items-center gap-2">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
              </span>
              <span>Prologue Shortcuts API</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
