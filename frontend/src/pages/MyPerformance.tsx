import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, CheckSquare, Clock, AlertCircle, Award, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

export default function MyPerformance() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0,
    totalHours: 0,
    avgCompletionTime: '0 hrs',
  });

  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', hours: 0, completed: 0 },
    { day: 'Tue', hours: 0, completed: 0 },
    { day: 'Wed', hours: 0, completed: 0 },
    { day: 'Thu', hours: 0, completed: 0 },
    { day: 'Fri', hours: 0, completed: 0 },
    { day: 'Sat', hours: 0, completed: 0 },
  ]);

  const fetchEmployeeStats = async () => {
    try {
      const res = await api.get('/api/tasks');
      const tasks = res.data || [];
        const my = tasks.filter((t: any) => t.assignee && (t.assignee.id === user?.id || t.assignee.name === user?.name));
        const done = my.filter((t: any) => t.status === 'COMPLETED').length;
        const total = my.length;
        const now = new Date();
        const overdue = my.filter((t: any) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now).length;
        const totalHours = my.reduce((acc: number, t: any) => acc + (t.actualTime || t.estimatedTime || 0), 0);
        const avgTime = done > 0 ? `${(totalHours / done).toFixed(1)} hrs` : '0 hrs';

        setStats({
          completed: done,
          pending: total - done,
          overdue,
          completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
          totalHours: Number(totalHours.toFixed(1)),
          avgCompletionTime: avgTime,
        });

        // Compute real weekly distribution from assigned tasks
        const dayMap: { [key: string]: { hours: number; completed: number } } = {
          Mon: { hours: 0, completed: 0 },
          Tue: { hours: 0, completed: 0 },
          Wed: { hours: 0, completed: 0 },
          Thu: { hours: 0, completed: 0 },
          Fri: { hours: 0, completed: 0 },
          Sat: { hours: 0, completed: 0 },
        };

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        my.forEach((t: any) => {
          const dateStr = t.completedAt || t.updatedAt || t.createdAt;
          if (dateStr) {
            const d = new Date(dateStr);
            const dayName = dayNames[d.getDay()];
            if (dayMap[dayName]) {
              dayMap[dayName].hours += (t.actualTime || t.estimatedTime || 0);
              if (t.status === 'COMPLETED') {
                dayMap[dayName].completed += 1;
              }
            }
          }
        });

        setWeeklyData([
          { day: 'Mon', hours: Number(dayMap.Mon.hours.toFixed(1)), completed: dayMap.Mon.completed },
          { day: 'Tue', hours: Number(dayMap.Tue.hours.toFixed(1)), completed: dayMap.Tue.completed },
          { day: 'Wed', hours: Number(dayMap.Wed.hours.toFixed(1)), completed: dayMap.Wed.completed },
          { day: 'Thu', hours: Number(dayMap.Thu.hours.toFixed(1)), completed: dayMap.Thu.completed },
          { day: 'Fri', hours: Number(dayMap.Fri.hours.toFixed(1)), completed: dayMap.Fri.completed },
          { day: 'Sat', hours: Number(dayMap.Sat.hours.toFixed(1)), completed: dayMap.Sat.completed },
        ]);
      } catch (err) {
        setStats({
          completed: 0,
          pending: 0,
          overdue: 0,
          completionRate: 0,
          totalHours: 0,
          avgCompletionTime: '0 hrs',
        });
      }
    };

    useEffect(() => {
      fetchEmployeeStats();
    }, [user]);

    // Hook into global live auto-refresh
    useLiveRefresh(fetchEmployeeStats);

  return (
    <div className="space-y-6 pb-20 w-full min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-500" /> My Performance & Productivity
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Personal productivity metrics, completed task rates, and weekly working hours breakdown for {user?.name}.
        </p>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
        <div className="glass-card-dashboard group p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-slate-400 truncate">Completion Rate</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completionRate}%</h3>
            </div>
            <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0">
              <TrendingUp className="w-5 h-5 hd-icon-badge text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-500 font-extrabold mt-3 truncate">
            {stats.completionRate > 80 ? '↑ High Productivity' : stats.completionRate > 0 ? '↑ In Progress' : '— No Activity Yet'}
          </p>
        </div>

        <div className="glass-card-dashboard group p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-slate-400 truncate">Tasks Completed</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completed}</h3>
            </div>
            <div className="hd-icon-container bg-blue-500/10 text-blue-500 border-blue-500/20 shrink-0">
              <CheckCircle2 className="w-5 h-5 hd-icon-badge text-blue-500" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-3 truncate">{stats.pending} Tasks Pending</p>
        </div>

        <div className="glass-card-dashboard group p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-slate-400 truncate">Total Hours Spent</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.totalHours}h</h3>
            </div>
            <div className="hd-icon-container bg-purple-500/10 text-purple-500 border-purple-500/20 shrink-0">
              <Clock className="w-5 h-5 hd-icon-badge text-purple-500" />
            </div>
          </div>
          <p className="text-[10px] text-purple-400 font-bold mt-3 truncate">Avg: {stats.avgCompletionTime} / task</p>
        </div>

        <div className="glass-card-dashboard group p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase text-slate-400 truncate">Overdue Tasks</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.overdue}</h3>
            </div>
            <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0">
              <Award className="w-5 h-5 hd-icon-badge text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-500 font-bold mt-3 truncate">
            {stats.overdue === 0 ? '✓ All deadlines met' : `⚠️ ${stats.overdue} overdue task(s)`}
          </p>
        </div>
      </div>

      {/* Weekly Productivity Chart */}
      <div className="glass-panel p-4 sm:p-6 w-full min-w-0">
        <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" /> Weekly Hours & Task Deliverables
        </h3>
        <div className="h-64 sm:h-72 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="hours" name="Working Hours" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="completed" name="Tasks Delivered" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
