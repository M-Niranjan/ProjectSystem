import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, Volume2, ShieldAlert } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export default function VoiceController() {
  const { voiceOverlayOpen, setVoiceOverlay, setView, toggleTheme, setPomodoroTimer } = useUIStore();
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [matchedCommand, setMatchedCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionError('Speech Recognition is not supported by your current browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('Listening... Speak now.');
      setMatchedCommand(null);
      setRecognitionError(null);
    };

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      processCommand(resultText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setRecognitionError('Microphone access denied. Please grant permissions.');
      } else {
        setRecognitionError('Could not process speech. Try again.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // Handle auto-start when opened
  useEffect(() => {
    if (voiceOverlayOpen && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  }, [voiceOverlayOpen]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('Listening...');
      setMatchedCommand(null);
      setRecognitionError(null);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const processCommand = (speech: string) => {
    const command = speech.toLowerCase();
    
    if (command.includes('dashboard') || command.includes('overview')) {
      setMatchedCommand('Navigating to Dashboard');
      setTimeout(() => {
        setView('dashboard');
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('project')) {
      setMatchedCommand('Navigating to Projects');
      setTimeout(() => {
        setView('projects');
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('board') || command.includes('kanban')) {
      setMatchedCommand('Navigating to Kanban Board');
      setTimeout(() => {
        setView('boards');
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('calendar') || command.includes('schedule')) {
      setMatchedCommand('Navigating to Calendar');
      setTimeout(() => {
        setView('calendar');
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('timeline') || command.includes('gantt') || command.includes('clock')) {
      setMatchedCommand('Navigating to Gantt Timeline');
      setTimeout(() => {
        setView('timeline');
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('theme') || command.includes('mode') || command.includes('dark') || command.includes('light')) {
      setMatchedCommand('Toggling System Theme');
      setTimeout(() => {
        toggleTheme();
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('focus') || command.includes('session') || command.includes('pomodoro') || command.includes('timer')) {
      setMatchedCommand('Activating Pomodoro Session');
      setTimeout(() => {
        setPomodoroTimer(true);
        setVoiceOverlay(false);
      }, 1200);
    } else if (command.includes('team') || command.includes('member')) {
      setMatchedCommand('Navigating to Team Hub');
      setTimeout(() => {
        setView('teams');
        setVoiceOverlay(false);
      }, 1200);
    } else {
      setMatchedCommand('Command unrecognized. Try saying: "Go to Calendar" or "Dark Mode".');
    }
  };

  return (
    <AnimatePresence>
      {voiceOverlayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              recognitionRef.current?.stop();
              setVoiceOverlay(false);
            }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          ></motion.div>

          {/* Voice card container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel w-full max-w-sm p-6 text-center shadow-2xl relative border border-slate-200/50 dark:border-white/10 flex flex-col items-center"
          >
            {/* Close button */}
            <button
              onClick={() => {
                recognitionRef.current?.stop();
                setVoiceOverlay(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-md font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 mb-6">
              <Volume2 className="w-5 h-5 text-blue-500 animate-bounce" />
              Voice Command Center
            </h3>

            {/* Glowing Orb with Mic Icon */}
            <div className="relative mb-6">
              <motion.div
                animate={isListening ? { scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-blue-500 blur-xl"
              ></motion.div>
              <button
                onClick={toggleListening}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer ${
                  isListening
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
              </button>
            </div>

            {/* Transcript & Matches */}
            <div className="min-h-16 w-full flex flex-col justify-center px-2 py-3 bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl mb-6">
              {recognitionError ? (
                <div className="text-xs font-bold text-red-500 flex items-center justify-center gap-1.5 px-3">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  {recognitionError}
                </div>
              ) : (
                <>
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 font-sans italic">
                    "{transcript || 'Waiting for voice inputs...'}"
                  </p>
                  {matchedCommand && (
                    <p className="text-[10px] font-black text-green-500 uppercase mt-2 flex items-center justify-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      {matchedCommand}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Instructions list */}
            <div className="text-[10px] font-bold text-slate-400 text-left w-full space-y-1 bg-slate-100/20 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200/30 dark:border-white/5">
              <p className="uppercase text-[9px] font-black tracking-wider text-slate-500 mb-1">Suggested Prompts:</p>
              <p>• "Go to Dashboard" / "Go Projects"</p>
              <p>• "Go to Kanban Board" / "Go Calendar"</p>
              <p>• "Go to Gantt Timeline"</p>
              <p>• "Toggle System Theme" (Dark/Light)</p>
              <p>• "Start Focus Session" (Pomodoro)</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
