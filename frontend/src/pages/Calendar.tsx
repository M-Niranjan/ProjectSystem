import React, { useState, useEffect, useRef, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  User,
  CheckCircle2,
  FolderGit2,
  PanelRight,
  PanelRightClose,
  LayoutGrid,
  ListTodo,
  Info
} from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';
import LuxurySelect from '../components/common/LuxurySelect';

interface Event {
  id: string;
  title: string;
  start: string;
  color?: string;
  allDay: boolean;
  extendedProps?: any;
}

export default function Calendar() {
  const { selectedProjectId } = useUIStore();
  const calendarRef = useRef<FullCalendar | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);

  // Active dates and views
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentTitle, setCurrentTitle] = useState<string>('October 2026');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeView, setActiveView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

  // Mobile mode: 'matrix' (Option 1: Touch Matrix + Deliverables Deck) vs 'grid' (Option 2: Full Month Grid)
  const [mobileMode, setMobileMode] = useState<'matrix' | 'grid'>('matrix');

  // Tablet & Desktop: Collapsible side agenda panel
  const [showSideAgenda, setShowSideAgenda] = useState<boolean>(true);

  // Fetch Projects List
  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      const list = Array.isArray(res.data) ? res.data : [];
      setProjectsList(list);
      if (!activeProjectId && list.length > 0) {
        setActiveProjectId(list[0].id);
      }
    } catch {
      setProjectsList([]);
    }
  };

  // Fetch Tasks for Active Project
  const fetchCalendarTasks = async () => {
    if (!activeProjectId) {
      setEvents([]);
      return;
    }
    try {
      const res = await api.get(`/api/tasks/project/${activeProjectId}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Event[] = res.data.map((t: any) => ({
          id: t.id.toString(),
          title: t.title,
          start: t.dueDate ? t.dueDate.split('T')[0] : new Date().toISOString().split('T')[0],
          allDay: true,
          color:
            t.priority === 'CRITICAL'
              ? '#EF4444'
              : t.priority === 'HIGH'
              ? '#F59E0B'
              : t.priority === 'MEDIUM'
              ? '#3B82F6'
              : '#64748B',
          extendedProps: t
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchCalendarTasks();
  }, [activeProjectId]);

  // Sync calendar title & date on view or date changes
  const updateCalendarState = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (apiInstance) {
      setCurrentTitle(apiInstance.view.title || apiInstance.getDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
      setCurrentDate(apiInstance.getDate());
    }
  };

  // Custom Navigation handlers
  const handlePrev = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (apiInstance) {
      apiInstance.prev();
      updateCalendarState();
    } else {
      const newD = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      setCurrentDate(newD);
      setCurrentTitle(newD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  };

  const handleNext = () => {
    const apiInstance = calendarRef.current?.getApi();
    if (apiInstance) {
      apiInstance.next();
      updateCalendarState();
    } else {
      const newD = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newD);
      setCurrentTitle(newD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  };

  const handleToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setSelectedDate(todayStr);
    const apiInstance = calendarRef.current?.getApi();
    if (apiInstance) {
      apiInstance.today();
      updateCalendarState();
    } else {
      setCurrentDate(today);
      setCurrentTitle(today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
    }
  };

  const handleChangeView = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setActiveView(view);
    const apiInstance = calendarRef.current?.getApi();
    if (apiInstance) {
      apiInstance.changeView(view);
      updateCalendarState();
    }
  };

  // Drag and drop task deadline updates
  const handleEventDrop = async (info: any) => {
    const taskId = info.event.id;
    const newDateStr = info.event.startStr ? info.event.startStr.split('T')[0] : '';
    const taskDetails = info.event.extendedProps;

    if (!taskDetails || !taskDetails.id) {
      setEvents(events.map(e => (e.id === taskId ? { ...e, start: newDateStr } : e)));
      return;
    }

    try {
      await api.put(`/api/tasks/${taskId}`, {
        ...taskDetails,
        dueDate: newDateStr
      });
      fetchCalendarTasks();
    } catch (err) {
      console.error('Failed to update task deadline', err);
      setEvents(events.map(e => (e.id === taskId ? { ...e, start: newDateStr } : e)));
    }
  };

  // Click event card to inspect detail
  const handleEventClick = (info: any) => {
    const taskDetails = info.event.extendedProps;
    if (taskDetails && taskDetails.id) {
      window.dispatchEvent(new CustomEvent('open-task-detail', { detail: taskDetails }));
    }
  };

  // Click day grid cell in FullCalendar
  const handleDateClick = (info: any) => {
    const dateStr = info.dateStr ? info.dateStr.split('T')[0] : '';
    setSelectedDate(dateStr);
  };

  // Tasks for currently selected day
  const selectedDateTasks = useMemo(() => {
    return events
      .filter(e => e.start && e.start.split('T')[0] === selectedDate)
      .map(e => e.extendedProps || { id: e.id, title: e.title, priority: 'MEDIUM', dueDate: e.start });
  }, [events, selectedDate]);

  // Formatted date string for selected day header
  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return 'Today';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDate]);

  // Mobile matrix day generator
  const mobileMatrixDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // Leading days from next month
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Priority color helper
  const getPriorityTheme = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-500/10 dark:bg-red-500/15',
          border: 'border-red-500/30',
          text: 'text-red-600 dark:text-red-400',
          glow: 'shadow-red-500/20',
          dot: 'bg-red-500'
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/15',
          border: 'border-amber-500/30',
          text: 'text-amber-600 dark:text-amber-400',
          glow: 'shadow-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'MEDIUM':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/15',
          border: 'border-blue-500/30',
          text: 'text-blue-600 dark:text-blue-400',
          glow: 'shadow-blue-500/20',
          dot: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-slate-500/10 dark:bg-slate-500/15',
          border: 'border-slate-500/30',
          text: 'text-slate-600 dark:text-slate-400',
          glow: 'shadow-slate-500/10',
          dot: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 max-w-7xl mx-auto w-full px-2 sm:px-4">
      {/* Top Bar: Title, Project Selector, Directives Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl p-3.5 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              Project Schedule
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-3 h-3" /> Interactive
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Interactive deadlines, sprint planning & drag-and-drop rescheduling.
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="w-full sm:w-64">
          <LuxurySelect
            value={activeProjectId || ''}
            onChange={(val) => setActiveProjectId(Number(val))}
            placeholder="Select Project..."
            options={projectsList.map(p => ({
              value: String(p.id),
              label: p.name,
              icon: <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
            }))}
          />
        </div>
      </div>

      {/* Directive Helper Banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span className="truncate">
          <strong className="text-indigo-600 dark:text-indigo-400 font-bold">Pro Tip:</strong> Click any date or event card to view and manage task details. Drag events on desktop to reschedule.
        </span>
      </div>

      {/* Unified Executive Header Controls (Resolves 3-tier stacking) */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation & Month Title Capsule */}
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
            <button
              onClick={handlePrev}
              title="Previous"
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 sm:px-3 py-1 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              title="Next"
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month / Year Title */}
          <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white px-2">
            {currentTitle}
          </div>
        </div>

        {/* View Switchers & Agenda Toggle */}
        <div className="flex items-center justify-between md:justify-end gap-2">
          {/* Mobile view switch (Matrix + Agenda vs Full Grid) */}
          <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 w-full sm:w-auto justify-center">
            <button
              onClick={() => setMobileMode('matrix')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileMode === 'matrix'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Agenda Deck
            </button>
            <button
              onClick={() => setMobileMode('grid')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mobileMode === 'grid'
                  ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Month Grid
            </button>
          </div>

          {/* Desktop/Tablet View Switcher */}
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
            <button
              onClick={() => handleChangeView('dayGridMonth')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'dayGridMonth'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handleChangeView('timeGridWeek')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'timeGridWeek'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handleChangeView('timeGridDay')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'timeGridDay'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
          </div>

          {/* Tablet/Desktop Toggle Side Agenda Panel */}
          <button
            onClick={() => setShowSideAgenda(!showSideAgenda)}
            title="Toggle Daily Agenda Panel"
            className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showSideAgenda
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {showSideAgenda ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            <span className="hidden lg:inline">{showSideAgenda ? 'Hide Agenda' : 'Show Agenda'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Calendar Main Container */}
        <div className={`transition-all duration-300 ${showSideAgenda ? 'lg:col-span-8 xl:col-span-8' : 'lg:col-span-12'}`}>
          {/* Mobile Option 1: Touch Matrix + Deliverables Deck (Approved Android Mobile Design 1) */}
          <div className={`md:hidden ${mobileMode === 'matrix' ? 'block' : 'hidden'} space-y-4`}>
            {/* Touch-Friendly Month Matrix */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm">
              {/* Day Name Header Row */}
              <div className="grid grid-cols-7 text-center mb-2.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => (
                  <span key={idx} className="text-[11px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {mobileMatrixDays.map((day, idx) => {
                  const isSelected = day.dateStr === selectedDate;
                  const isToday = day.dateStr === todayStr;
                  const dayTasks = events.filter(e => e.start && e.start.split('T')[0] === day.dateStr);
                  const hasTasks = dayTasks.length > 0;

                  // Determine priority dots
                  const hasCritical = dayTasks.some(t => t.extendedProps?.priority === 'CRITICAL');
                  const hasHigh = dayTasks.some(t => t.extendedProps?.priority === 'HIGH');
                  const hasMedium = dayTasks.some(t => t.extendedProps?.priority === 'MEDIUM');

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`relative flex flex-col items-center justify-center h-11 sm:h-12 rounded-xl transition-all duration-150 ${
                        isSelected
                          ? 'bg-gradient-to-b from-indigo-500 to-cyan-500 text-white font-black shadow-lg shadow-indigo-500/30 scale-105 z-10 ring-2 ring-cyan-300'
                          : isToday
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-400/50 text-indigo-600 dark:text-indigo-400 font-black'
                          : day.isCurrentMonth
                          ? 'bg-white/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold'
                          : 'bg-transparent text-slate-300 dark:text-slate-600 font-medium'
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{day.dayNum}</span>

                      {/* Micro Task Indicator Dots */}
                      {hasTasks && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {hasCritical ? (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                          ) : hasHigh ? (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400'}`} />
                          ) : hasMedium ? (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                          )}
                          {dayTasks.length > 1 && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-cyan-400'}`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Deliverables Deck for Selected Day */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Deliverables: {formattedSelectedDate}
                  </h3>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selectedDateTasks.length} {selectedDateTasks.length === 1 ? 'Task' : 'Tasks'}
                </span>
              </div>

              {/* Task Items List */}
              {selectedDateTasks.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No tasks due on this date</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Select another day with indicator dots or add new project milestones.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDateTasks.map((task: any, index: number) => {
                    const priorityTheme = getPriorityTheme(task.priority);
                    const isDone = task.status === 'DONE' || task.status === 'COMPLETED';

                    return (
                      <div
                        key={task.id || index}
                        onClick={() => window.dispatchEvent(new CustomEvent('open-task-detail', { detail: task }))}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm ${priorityTheme.border} hover:shadow-md hover:scale-[1.01]`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityTheme.dot}`} />
                            <div className="min-w-0 flex-1">
                              <h4 className={`text-sm font-bold text-slate-900 dark:text-white truncate ${isDone ? 'line-through opacity-60' : ''}`}>
                                {task.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityTheme.bg} ${priorityTheme.text}`}>
                                  {task.priority || 'NORMAL'}
                                </span>
                                {task.status && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                                    {task.status.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Assignee / Action */}
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex-shrink-0">
                              <User className="w-3 h-3 text-indigo-400" />
                              <span className="max-w-[70px] truncate">{task.assignee.name || 'Assigned'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 flex-shrink-0">
                              <Clock className="w-3.5 h-3.5" />
                              <span>View</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* FullCalendar Grid View (Used for Desktop, Tablet, and Mobile Grid Option 2) */}
          <div
            className={`custom-calendar-container bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-3 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm ${
              mobileMode === 'grid' ? 'block' : 'hidden md:block'
            }`}
          >
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={activeView}
              headerToolbar={false} /* Custom executive toolbar used instead */
              editable={true}
              selectable={true}
              events={events}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              dateClick={handleDateClick}
              datesSet={updateCalendarState}
              height="auto"
              dayMaxEvents={3}
              eventContent={(eventInfo) => {
                const task = eventInfo.event.extendedProps;
                const priority = task?.priority || 'MEDIUM';
                const theme = getPriorityTheme(priority);
                const isDone = task?.status === 'DONE' || task?.status === 'COMPLETED';

                return (
                  <div className="flex items-center gap-1.5 w-full overflow-hidden text-left py-0.5 px-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
                    <span className={`truncate text-[11px] font-semibold tracking-tight ${isDone ? 'line-through opacity-70' : ''}`}>
                      {eventInfo.event.title}
                    </span>
                  </div>
                );
              }}
            />
          </div>
        </div>

        {/* Desktop / Tablet Dedicated "Daily Agenda & Deadlines" Panel (Option 2 Bento & Tablet Design) */}
        {showSideAgenda && (
          <div className="hidden lg:block lg:col-span-4 xl:col-span-4 space-y-4">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Daily Agenda & Deadlines
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formattedSelectedDate}
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  {selectedDateTasks.length} Due
                </span>
              </div>

              {/* Task Items Feed */}
              {selectedDateTasks.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500/70" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">All Clear for This Day</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[220px] mx-auto">
                    No deadlines or deliverables due on {formattedSelectedDate}. Click any date tile to inspect.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {selectedDateTasks.map((task: any, index: number) => {
                    const priorityTheme = getPriorityTheme(task.priority);
                    const isDone = task.status === 'DONE' || task.status === 'COMPLETED';

                    return (
                      <div
                        key={task.id || index}
                        onClick={() => window.dispatchEvent(new CustomEvent('open-task-detail', { detail: task }))}
                        className={`p-3.5 rounded-xl border bg-white/90 dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.01] ${priorityTheme.border}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${priorityTheme.bg} ${priorityTheme.text}`}>
                            {task.priority || 'NORMAL'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                            {task.status?.replace('_', ' ') || 'TASK'}
                          </span>
                        </div>

                        <h4 className={`text-sm font-bold text-slate-900 dark:text-white mt-2 leading-snug ${isDone ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5 font-medium">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                                {task.assignee.name ? task.assignee.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-slate-400">Unassigned</span>
                          )}

                          <span className="text-indigo-500 hover:text-indigo-400 font-bold text-xs flex items-center gap-0.5">
                            Details &rarr;
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Luxury FullCalendar Style Overrides (Eliminates harsh 1px borders & table misalignment) */}
      <style>{`
        .custom-calendar-container .fc {
          --fc-border-color: rgba(226, 232, 240, 0.7);
          --fc-today-bg-color: transparent;
          font-family: inherit;
        }
        .dark .custom-calendar-container .fc {
          --fc-border-color: rgba(255, 255, 255, 0.08);
        }

        /* Seamless borderless container */
        .custom-calendar-container .fc-theme-standard td,
        .custom-calendar-container .fc-theme-standard th,
        .custom-calendar-container .fc-scrollgrid {
          border-color: var(--fc-border-color) !important;
        }

        .custom-calendar-container .fc-scrollgrid {
          border-radius: 16px !important;
          overflow: hidden !important;
          border: 1px solid var(--fc-border-color) !important;
        }

        /* Column Headers (Day names) */
        .custom-calendar-container .fc-col-header-cell {
          background-color: rgba(148, 163, 184, 0.04) !important;
          padding: 8px 0 !important;
          border-bottom: 1px solid var(--fc-border-color) !important;
        }
        .dark .custom-calendar-container .fc-col-header-cell {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .custom-calendar-container .fc-col-header-cell-cushion {
          font-size: 0.72rem !important;
          font-weight: 800 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
          color: var(--text-tertiary, #94a3b8) !important;
          text-decoration: none !important;
        }

        /* Day Numbers */
        .custom-calendar-container .fc-daygrid-day-number {
          font-size: 0.78rem !important;
          font-weight: 700 !important;
          color: var(--text-secondary, #64748b) !important;
          padding: 6px 8px !important;
          text-decoration: none !important;
        }
        .dark .custom-calendar-container .fc-daygrid-day-number {
          color: #94a3b8 !important;
        }

        /* Day Cells */
        .custom-calendar-container .fc-daygrid-day-frame {
          min-height: 85px !important;
          transition: background-color 0.15s ease;
          cursor: pointer;
        }
        .custom-calendar-container .fc-daygrid-day:hover .fc-daygrid-day-frame {
          background-color: rgba(255, 255, 255, 0.03) !important;
        }
        :root:not(.dark) .custom-calendar-container .fc-daygrid-day:hover .fc-daygrid-day-frame {
          background-color: rgba(241, 245, 249, 0.6) !important;
        }

        /* Radiant Today Cell */
        .custom-calendar-container .fc-day-today {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(99, 102, 241, 0.06)) !important;
        }
        .custom-calendar-container .fc-day-today .fc-daygrid-day-number {
          color: #38bdf8 !important;
          font-weight: 900 !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(56, 189, 248, 0.18);
          border-radius: 9999px;
          width: 24px;
          height: 24px;
          margin: 3px;
          padding: 0 !important;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.35);
        }

        /* Luxury Event Pills */
        .custom-calendar-container .fc-event {
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px !important;
          padding: 2px 4px !important;
          backdrop-filter: blur(8px) !important;
          margin: 1.5px 3px !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
          transition: transform 0.12s ease, box-shadow 0.12s ease !important;
          cursor: pointer !important;
        }
        .custom-calendar-container .fc-event:hover {
          transform: translateY(-1px) scale(1.02) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
        }

        /* View more link */
        .custom-calendar-container .fc-daygrid-more-link {
          font-size: 0.7rem !important;
          font-weight: 800 !important;
          color: #38bdf8 !important;
          padding: 1px 4px !important;
          border-radius: 4px !important;
          background: rgba(56, 189, 248, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
