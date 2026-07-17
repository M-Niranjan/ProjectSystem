import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Play, Pause, RotateCcw, X, Volume2, Sparkles, Coffee } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import confetti from 'canvas-confetti';

export default function PomodoroTimer() {
  const { pomodoroTimerOpen, setPomodoroTimer } = useUIStore();
  const [mode, setMode] = useState<'FOCUS' | 'BREAK'>('FOCUS');
  const [isActive, setIsActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60); // 25 mins

  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  const handleSessionComplete = () => {
    setIsActive(false);
    
    // Play mock chime notification or trigger confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (Notification.permission === 'granted') {
      new Notification(
        mode === 'FOCUS' 
          ? 'Focus Session Completed! 🚀' 
          : 'Break Session Completed! ☕',
        { body: mode === 'FOCUS' ? 'Great job! Take a short 5-minute break.' : 'Back to focus! Ready for the next task?' }
      );
    } else {
      alert(mode === 'FOCUS' ? 'Focus Session Completed! Great job!' : 'Break Session Completed! Ready to focus?');
    }

    // Toggle mode automatically
    if (mode === 'FOCUS') {
      setMode('BREAK');
      setSecondsLeft(5 * 60);
    } else {
      setMode('FOCUS');
      setSecondsLeft(25 * 60);
    }
  };

  const startTimer = () => {
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsActive(true);
  };

  const pauseTimer = () => setIsActive(false);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(mode === 'FOCUS' ? 25 * 60 : 5 * 60);
  };

  const toggleMode = (newMode: 'FOCUS' | 'BREAK') => {
    setIsActive(false);
    setMode(newMode);
    setSecondsLeft(newMode === 'FOCUS' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <AnimatePresence>
      {pomodoroTimerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPomodoroTimer(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
          ></motion.div>

          {/* Timer Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-sm p-6 text-center shadow-2xl relative border border-slate-200/50 dark:border-white/10 flex flex-col items-center"
          >
            {/* Close */}
            <button
              onClick={() => setPomodoroTimer(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-6">
              <Clock className="w-5 h-5 text-blue-500 animate-spin-slow" />
              Focus Pomodoro Session
            </h3>

            {/* Mode Selector Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl mb-6">
              <button
                onClick={() => toggleMode('FOCUS')}
                className={`px-4 py-2 rounded-lg text-xs font-black cursor-pointer transition-colors flex items-center gap-1 ${
                  mode === 'FOCUS' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Focus (25m)
              </button>
              <button
                onClick={() => toggleMode('BREAK')}
                className={`px-4 py-2 rounded-lg text-xs font-black cursor-pointer transition-colors flex items-center gap-1 ${
                  mode === 'BREAK' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" /> Break (5m)
              </button>
            </div>

            {/* Timer Output */}
            <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  className="stroke-slate-200 dark:stroke-slate-800 fill-transparent"
                  strokeWidth="6"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  className="stroke-blue-600 fill-transparent transition-all"
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 72}
                  strokeDashoffset={2 * Math.PI * 72 * (1 - secondsLeft / (mode === 'FOCUS' ? 25 * 60 : 5 * 60))}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-widest">
                {formatTime(secondsLeft)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex gap-4">
              <button
                onClick={resetTimer}
                className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-white/10 cursor-pointer"
                title="Reset Session"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {isActive ? (
                <button
                  onClick={pauseTimer}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow shadow-amber-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Pause className="w-4.5 h-4.5 fill-current" /> Pause Session
                </button>
              ) : (
                <button
                  onClick={startTimer}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow shadow-blue-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-4.5 h-4.5 fill-current" /> Start Focus
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
