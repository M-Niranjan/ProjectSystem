import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { BarChart3, CheckSquare, Clock, AlertCircle, Award, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function MyPerformance() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    completed: 12,
    pending: 3,
    overdue: 0,
    completionRate: 92,
    totalHours: 42.5,
    avgCompletionTime: '3.2 hrs',
  });

  const weeklyData = [
    { day: 'Mon', hours: 7.5, completed: 3 },
    { day: 'Tue', hours: 8.0, completed: 4 },
    { day: 'Wed', hours: 8.5, completed: 5 },
    { day: 'Thu', hours: 7.0, completed: 2 },
    { day: 'Fri', hours: 8.0, completed: 4 },
    { day: 'Sat', hours: 3.5, completed: 1 },
  ];

  useEffect(() => {
    const fetchEmployeeStats = async () => {
      try {
        const res = await api.get('/api/tasks');
        const tasks = res.data || [];
        const my = tasks.filter((t: any) => t.assignee && (t.assignee.id === user?.id || t.assignee.name === user?.name));
        const done = my.filter((t: any) => t.status === 'COMPLETED').length;
        const total = my.length;
        if (total > 0) {
          setStats(prev => ({
            ...prev,
            completed: done,
            pending: total - done,
            completionRate: Math.round((done / total) * 100)
          }));
        }
      } catch (err) {
        console.log('Using default employee stats');
      }
    };
    fetchEmployeeStats();
  }, [user]);

  return (
    <div className="space-y-6 select-none pb-12 w-full min-w-0">
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Completion Rate</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completionRate}%</h3>
            </div>
            <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <TrendingUp className="w-5 h-5 hd-icon-badge text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-500 font-extrabold mt-3">↑ High Productivity Rating</p>
        </div>

        <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Tasks Completed</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.completed}</h3>
            </div>
            <div className="hd-icon-container bg-blue-500/10 text-blue-500 border-blue-500/20">
              <CheckCircle2 className="w-5 h-5 hd-icon-badge text-blue-500" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-3">{stats.pending} Tasks Pending</p>
        </div>

        <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Total Hours Spent</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.totalHours}h</h3>
            </div>
            <div className="hd-icon-container bg-purple-500/10 text-purple-500 border-purple-500/20">
              <Clock className="w-5 h-5 hd-icon-badge text-purple-500" />
            </div>
          </div>
          <p className="text-[10px] text-purple-400 font-bold mt-3">Avg: {stats.avgCompletionTime} / task</p>
        </div>

        <div className="glass-card-dashboard group p-5 relative overflow-hidden flex flex-col justify-between cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400">Overdue Tasks</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{stats.overdue}</h3>
            </div>
            <div className="hd-icon-container bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <Award className="w-5 h-5 hd-icon-badge text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] text-emerald-500 font-bold mt-3">✓ All deadlines met</p>
        </div>
      </div>

      {/* Weekly Productivity Chart */}
      <div className="glass-panel p-6">
        <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" /> Weekly Hours & Task Deliverables
        </h3>
        <div className="h-64 w-full">
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
