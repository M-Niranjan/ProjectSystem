import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';

// Components & Modules
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import VoiceController from './components/VoiceController';
import PomodoroTimer from './components/PomodoroTimer';
import TaskDetailModal from './components/TaskDetailModal';
import CreateProjectModal from './components/CreateProjectModal';
import CreateTaskModal from './components/CreateTaskModal';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Boards from './pages/Boards';
import Calendar from './pages/Calendar';
import Timeline from './pages/Timeline';
import Teams from './pages/Teams';
import Messages from './pages/Messages';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';

const queryClient = new QueryClient();

function AppContent() {
  const { user, token, initAuth, loading } = useAuthStore();
  const { activeView, initTheme, sidebarExpanded } = useUIStore();

  // Initialize theme mode and validate existing session JWT token on load
  useEffect(() => {
    initTheme();
    initAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white select-none">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full mb-4"
        ></motion.div>
        <p className="text-xs font-black tracking-widest text-slate-400 uppercase animate-pulse">Initializing Prologue Workspace...</p>
      </div>
    );
  }

  // Render Login page if unauthorized
  if (!token || !user) {
    return <Login />;
  }

  // Render view dispatcher
  const renderView = () => {
    // Role-based protection: Employees cannot access administrative views
    if (user.role === 'ROLE_EMPLOYEE') {
      const blockedViews = ['projects', 'timeline', 'teams', 'reports'];
      if (blockedViews.includes(activeView)) {
        return (
          <div className="glass-panel p-12 text-center max-w-md mx-auto space-y-6 border border-red-500/10">
            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl animate-bounce">
              🛡️
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Access Denied</h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                You are not authorized to view the administrative module <strong className="text-red-500">{activeView.toUpperCase()}</strong>.
              </p>
            </div>
            <button
              onClick={() => useUIStore.getState().setView('dashboard')}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
            >
              Return to Workspace Dashboard
            </button>
          </div>
        );
      }
    }

    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <Projects />;
      case 'tasks':
        return <Tasks />;
      case 'boards':
        return <Boards />;
      case 'calendar':
        return <Calendar />;
      case 'timeline':
        return <Timeline />;
      case 'teams':
        return <Teams />;
      case 'messages':
        return <Messages />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'profile':
        return <Profile />;
      case 'documents':
        return <Documents />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="relative min-h-screen select-none overflow-x-hidden">
      {/* Background drifting layers */}
      <div className="animated-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
        <div className="noise-overlay"></div>
      </div>

      {/* Core Shell Structure */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Content Wrapper */}
        <div 
          className="flex-1 flex flex-col min-h-screen transition-all duration-400"
          style={{ paddingLeft: sidebarExpanded ? '260px' : '76px' }}
        >
          {/* Header Frosted Navbar */}
          <Navbar />

          {/* Main Workspace Frame */}
          <main className="flex-1 pt-24 px-6 md:px-8 w-full max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="w-full h-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Floating Utilities */}
      <CommandPalette />
      <VoiceController />
      <PomodoroTimer />
      <TaskDetailModal />
      <CreateProjectModal />
      <CreateTaskModal />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
