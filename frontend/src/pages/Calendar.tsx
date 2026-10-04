import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
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
  const [events, setEvents] = useState<Event[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      const list = Array.isArray(res.data) ? res.data : [];
      setProjectsList(list);
      if (!activeProjectId && list.length > 0) {
        setActiveProjectId(list[0].id);
      }
    } catch (err) {
      setProjectsList([]);
    }
  };

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
          start: t.dueDate || new Date().toISOString().split('T')[0],
          allDay: true,
          color: t.priority === 'CRITICAL' ? '#EF4444' : t.priority === 'HIGH' ? '#F59E0B' : t.priority === 'MEDIUM' ? '#3B82F6' : '#64748B',
          extendedProps: t
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setEvents([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchCalendarTasks();
  }, [activeProjectId]);

  const handleEventDrop = async (info: any) => {
    const taskId = info.event.id;
    const newDateStr = info.event.startStr;
    const taskDetails = info.event.extendedProps;

    if (!taskDetails || !taskDetails.id) {
      // Offline fallback
      setEvents(events.map(e => e.id === taskId ? { ...e, start: newDateStr } : e));
      return;
    }

    try {
      // Update task deadline in backend
      await api.put(`/api/tasks/${taskId}`, {
        ...taskDetails,
        dueDate: newDateStr
      });
      fetchCalendarTasks();
    } catch (err) {
      console.error('Failed to update task deadline', err);
      // Offline fallback
      setEvents(events.map(e => e.id === taskId ? { ...e, start: newDateStr } : e));
    }
  };

  const handleEventClick = (info: any) => {
    const taskDetails = info.event.extendedProps;
    if (taskDetails && taskDetails.id) {
      window.dispatchEvent(new CustomEvent('open-task-detail', { detail: taskDetails }));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
            FullCalendar Schedule
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Review and reschedule task deadlines with interactive click drags.
          </p>
        </div>

        <LuxurySelect
          className="w-full sm:w-56"
          value={activeProjectId || ''}
          onChange={(val) => setActiveProjectId(Number(val))}
          placeholder="Select Project..."
          options={projectsList.map(p => ({
            value: String(p.id),
            label: p.name
          }))}
        />
      </div>

      {/* Info Warning banner */}
      <div className="glass-panel p-3 border-l-4 border-l-blue-500 bg-blue-500/5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          <p className="font-black text-slate-800 dark:text-slate-100">Calendar Directives:</p>
          <p className="mt-1">1. You can drag and drop events directly onto different calendar dates to reschedule.</p>
          <p>2. Clicking on any event card opens up its task checklist detail inspector.</p>
        </div>
      </div>

      {/* FullCalendar Wrapper Panel */}
      <div className="glass-panel p-3 sm:p-6 shadow-xl border border-slate-200/50 dark:border-white/5 bg-white/30 overflow-x-auto">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          editable={true}
          selectable={true}
          events={events}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          height="70vh"
        />
      </div>

      {/* Styled FullCalendar modifications via index.css overlays */}
      <style>{`
        .fc {
          font-family: inherit;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: rgba(148, 163, 184, 0.12) !important;
        }
        .fc-header-toolbar {
          margin-bottom: 1.5rem !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
        }
        @media (max-width: 640px) {
          .fc-header-toolbar {
            flex-direction: column !important;
            align-items: center !important;
            gap: 10px !important;
          }
          .fc-toolbar-title {
            font-size: 1.1rem !important;
            text-align: center !important;
          }
          .fc-button-primary {
            padding: 5px 8px !important;
            font-size: 0.65rem !important;
          }
        }
        .fc-button-primary {
          background-color: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(148, 163, 184, 0.15) !important;
          color: var(--text-primary) !important;
          font-size: 0.75rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          border-radius: 10px !important;
          padding: 6px 12px !important;
        }
        .fc-button-primary:hover {
          background-color: rgba(255, 255, 255, 0.15) !important;
        }
        .fc-button-active {
          background-color: var(--primary-light) !important;
          color: white !important;
          border-color: transparent !important;
        }
        .fc-col-header-cell {
          background-color: rgba(148, 163, 184, 0.05) !important;
          padding: 8px 0 !important;
          font-size: 0.7rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          font-weight: 800 !important;
        }
        .fc-daygrid-day-number {
          font-size: 0.75rem !important;
          font-weight: bold !important;
          color: var(--text-secondary) !important;
          padding: 6px !important;
        }
        .fc-day-today {
          background-color: rgba(59, 130, 246, 0.15) !important;
          box-shadow: inset 0 0 0 2.5px rgba(59, 130, 246, 0.25) !important;
        }
        .dark .fc-day-today {
          background-color: rgba(59, 130, 246, 0.22) !important;
          box-shadow: inset 0 0 0 2.5px rgba(59, 130, 246, 0.4) !important;
        }
        .fc-event {
          border: none !important;
          border-radius: 6px !important;
          padding: 2px 4px !important;
          font-size: 0.7rem !important;
          font-weight: bold !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  );
}
