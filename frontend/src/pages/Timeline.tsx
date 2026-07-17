import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, ZoomIn, ZoomOut, Calendar, Plus, RefreshCw, Milestone, Layers, Users } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  startDate?: string;
  progress: number; // 0 to 100
  assignee?: string;
  dependencyId?: number;
  isMilestone?: boolean;
}

export default function Timeline() {
  const { selectedProjectId } = useUIStore();
  const [zoom, setZoom] = useState<'DAY' | 'WEEK' | 'MONTH'>('WEEK');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);

  const mockTasks: Task[] = [
    { id: 101, title: 'Database Schema Drafting', status: 'COMPLETED', priority: 'HIGH', startDate: '2026-07-01', dueDate: '2026-07-06', progress: 100, assignee: 'Bob' },
    { id: 102, title: 'Auth API JWT integration', status: 'COMPLETED', priority: 'CRITICAL', startDate: '2026-07-04', dueDate: '2026-07-09', progress: 100, assignee: 'Bob', dependencyId: 101 },
    { id: 103, title: 'Glassmorphic Login UI design', status: 'IN_PROGRESS', priority: 'HIGH', startDate: '2026-07-08', dueDate: '2026-07-15', progress: 60, assignee: 'Alice', dependencyId: 102 },
    { id: 104, title: 'Milestone: Alpha Release v1.0', status: 'IN_PROGRESS', priority: 'CRITICAL', startDate: '2026-07-15', dueDate: '2026-07-15', progress: 10, isMilestone: true },
    { id: 105, title: 'AWS Cloud Deployment Config', status: 'TO_DO', priority: 'CRITICAL', startDate: '2026-07-16', dueDate: '2026-07-22', progress: 0, assignee: 'Charlie', dependencyId: 104 },
    { id: 106, title: 'Timeline & Calendar Testing', status: 'TO_DO', priority: 'MEDIUM', startDate: '2026-07-20', dueDate: '2026-07-26', progress: 0, assignee: 'Alice', dependencyId: 103 }
  ];

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      setProjectsList(res.data);
      if (!activeProjectId && res.data.length > 0) {
        setActiveProjectId(res.data[0].id);
      }
    } catch (err) {
      setProjectsList([
        { id: 1, name: 'Prologue SaaS Dashboard' },
        { id: 2, name: 'Workflow Suite Integration' }
      ]);
      if (!activeProjectId) setActiveProjectId(1);
    }
  };

  const fetchTimelineTasks = async () => {
    if (!activeProjectId) return;
    try {
      const res = await api.get(`/api/tasks/project/${activeProjectId}`);
      if (res.data && res.data.length > 0) {
        // Map backend properties to Gantt structure
        const mapped: Task[] = res.data.map((t: any, idx: number) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          startDate: t.createdAt ? t.createdAt.split('T')[0] : '2026-07-01',
          dueDate: t.dueDate || '2026-07-14',
          progress: t.status === 'COMPLETED' ? 100 : t.status === 'REVIEW' ? 90 : t.status === 'IN_PROGRESS' ? 50 : 0,
          assignee: t.assignee ? t.assignee.name : 'Unassigned',
          dependencyId: idx > 0 ? res.data[idx - 1].id : undefined // Simulated dependency
        }));
        setTasks(mapped);
      } else {
        setTasks(mockTasks);
      }
    } catch (err) {
      setTasks(mockTasks);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTimelineTasks();
  }, [activeProjectId]);

  // Calendar dates generation based on zoom
  const daysInGantt = 30;
  const startDateGantt = new Date('2026-07-01');

  const getTimelineHeaders = () => {
    const headers = [];
    for (let i = 0; i < daysInGantt; i++) {
      const date = new Date(startDateGantt);
      date.setDate(startDateGantt.getDate() + i);
      headers.push(date);
    }
    return headers;
  };

  const timelineHeaders = getTimelineHeaders();

  // Position calculation helpers
  const calculatePosition = (startStr?: string, dueStr?: string) => {
    if (!startStr || !dueStr) return { left: 0, width: 80 };
    
    const start = new Date(startStr);
    const due = new Date(dueStr);
    
    const diffStartMs = start.getTime() - startDateGantt.getTime();
    const diffDueMs = due.getTime() - startDateGantt.getTime();
    
    const startDay = Math.max(0, Math.floor(diffStartMs / (24 * 60 * 60 * 1000)));
    const dueDay = Math.max(0, Math.floor(diffDueMs / (24 * 60 * 60 * 1000)));
    
    const colWidth = zoom === 'DAY' ? 60 : zoom === 'WEEK' ? 40 : 20;
    
    const left = startDay * colWidth;
    let width = (dueDay - startDay + 1) * colWidth;
    if (width <= 0) width = colWidth; // Minimum width

    return { left, width };
  };

  return (
    <div className="space-y-6 select-none h-[calc(100vh-100px)] flex flex-col pb-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              Gantt Timelines
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Visualize task schedules, milestone nodes, and dependency links.
            </p>
          </div>

          <select
            value={activeProjectId || ''}
            onChange={(e) => setActiveProjectId(Number(e.target.value))}
            className="px-3 py-1.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-bold text-xs cursor-pointer appearance-none"
          >
            {projectsList.map(p => (
              <option className="dark:bg-slate-800" key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/5 border border-slate-200/50 dark:border-white/5 p-1 rounded-xl">
            {(['DAY', 'WEEK', 'MONTH'] as const).map(z => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                  zoom === z ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTimelineTasks}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
            title="Reload Timeline"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex-1 glass-panel border border-slate-200/50 dark:border-white/5 flex overflow-hidden min-h-0">
        {/* Left Side: Tasks Labels List */}
        <div className="w-64 border-r border-slate-200/30 dark:border-white/5 flex flex-col flex-shrink-0 bg-slate-500/5">
          <div className="h-12 border-b border-slate-200/30 dark:border-white/5 px-4 flex items-center flex-shrink-0">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Project Tasks List</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-1">
            {tasks.map(t => (
              <div key={t.id} className="h-14 px-4 flex flex-col justify-center text-xs">
                <span className={`font-black truncate ${t.isMilestone ? 'text-indigo-600 dark:text-indigo-400 flex items-center gap-1' : 'text-slate-800 dark:text-slate-200'}`}>
                  {t.isMilestone && <Milestone className="w-3.5 h-3.5" />}
                  {t.title}
                </span>
                <span className="text-[9px] font-semibold text-slate-400 truncate mt-0.5">
                  {t.isMilestone ? 'Milestone' : `Assigned to: ${t.assignee || 'Unassigned'}`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Timeline Grid Chart */}
        <div className="flex-1 overflow-auto flex flex-col relative">
          
          {/* Header Row Days/Weeks */}
          <div className="h-12 border-b border-slate-200/30 dark:border-white/5 flex flex-shrink-0 select-none bg-slate-500/5">
            {timelineHeaders.map((date, idx) => {
              const colWidth = zoom === 'DAY' ? 60 : zoom === 'WEEK' ? 40 : 20;
              return (
                <div
                  key={idx}
                  className="flex-shrink-0 flex flex-col justify-center items-center text-[9px] font-bold text-slate-500 border-r border-slate-200/10 dark:border-white/5"
                  style={{ width: colWidth }}
                >
                  <span>{date.toLocaleDateString([], { weekday: 'narrow' })}</span>
                  <span className="font-black text-slate-800 dark:text-slate-200">{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Grid Rows with bars */}
          <div className="flex-1 relative min-h-0 py-1">
            {/* Draw grid columns background */}
            <div className="absolute inset-0 flex pointer-events-none">
              {timelineHeaders.map((_, idx) => {
                const colWidth = zoom === 'DAY' ? 60 : zoom === 'WEEK' ? 40 : 20;
                return (
                  <div
                    key={idx}
                    className="h-full border-r border-slate-100 dark:border-white/5 flex-shrink-0"
                    style={{ width: colWidth }}
                  ></div>
                );
              })}
            </div>

            {/* Task bars */}
            <div className="relative space-y-0 divide-y divide-slate-100/30 dark:divide-white/5">
              {tasks.map(t => {
                const { left, width } = calculatePosition(t.startDate, t.dueDate);
                return (
                  <div key={t.id} className="h-14 relative flex items-center">
                    {t.isMilestone ? (
                      // Milestone Diamond Shape
                      <div
                        className="absolute h-5 w-5 bg-indigo-600 rotate-45 flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer"
                        style={{ left: left + (width / 2) - 10 }}
                        title={t.title}
                      >
                        <div className="h-2.5 w-2.5 bg-white rounded-full"></div>
                      </div>
                    ) : (
                      // Standard Task Duration Bar
                      <div
                        className="absolute h-7 rounded-xl bg-gradient-to-r from-blue-600/35 to-indigo-600/35 border border-blue-500/40 shadow-sm flex items-center px-3 cursor-pointer overflow-hidden group hover:border-blue-500 transition-colors"
                        style={{ left, width }}
                        title={`${t.title} (${t.progress}% done)`}
                      >
                        {/* Progress slider */}
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500/25 rounded-l-xl"
                          style={{ width: `${t.progress}%` }}
                        ></div>
                        <span className="text-[10px] font-black text-slate-800 dark:text-white truncate relative z-10">
                          {t.progress}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Draw Dependency Paths in SVG Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {tasks.map((t, idx) => {
                  if (t.dependencyId) {
                    const depIndex = tasks.findIndex(x => x.id === t.dependencyId);
                    if (depIndex !== -1) {
                      const depTask = tasks[depIndex];
                      
                      const depPos = calculatePosition(depTask.startDate, depTask.dueDate);
                      const taskPos = calculatePosition(t.startDate, t.dueDate);
                      
                      // Calculate coordinates (row center)
                      const startX = depPos.left + depPos.width;
                      const startY = (depIndex * 56) + 28; // rowHeight=56, center=28
                      
                      const endX = taskPos.left;
                      const endY = (idx * 56) + 28;
                      
                      // Path drawing a nice cubic bend line
                      const midX = startX + (endX - startX) / 2;
                      return (
                        <path
                          key={`dep-${t.id}`}
                          d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                          markerEnd="url(#arrow)"
                        />
                      );
                    }
                  }
                  return null;
                })}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
