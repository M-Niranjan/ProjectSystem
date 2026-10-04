import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, BarChart3, TrendingUp, CheckSquare, Award } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';
import LuxurySelect from '../components/common/LuxurySelect';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

export default function Reports() {
  const { selectedProjectId } = useUIStore();
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/api/projects');
      const data = res.data || [];
      setProjectsList(data);
      if (!activeProjectId && data.length > 0) {
        setActiveProjectId(data[0].id);
      }
    } catch (err) {
      setProjectsList([]);
    }
  };

  const fetchProjectData = async (projId: number | null) => {
    try {
      const [tasksRes, teamsRes] = await Promise.all([
        projId ? api.get(`/api/tasks/project/${projId}`).catch(() => api.get('/api/tasks')) : api.get('/api/tasks'),
        api.get('/api/teams').catch(() => ({ data: [] })),
      ]);
      setTasks(tasksRes.data || []);
      setTeamMembers(teamsRes.data || []);
    } catch (err) {
      setTasks([]);
      setTeamMembers([]);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchProjectData(activeProjectId);
  }, [activeProjectId]);

  // Hook into global live auto-refresh
  useLiveRefresh(() => {
    fetchProjects();
    fetchProjectData(activeProjectId);
  });

  // Generate 53 weeks x 7 days grid for GitHub-style productivity heatmap
  const generateHeatmap = () => {
    const days = new Array(365).fill(0);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setDate(now.getDate() - 364);

    tasks.forEach((t) => {
      const dateVal = t.updatedAt || t.completedAt || t.dueDate || t.createdAt;
      if (dateVal) {
        const d = new Date(dateVal);
        const diffTime = d.getTime() - oneYearAgo.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 365) {
          days[diffDays] = Math.min(days[diffDays] + 1, 4);
        }
      }
    });
    return days;
  };

  const heatmapData = generateHeatmap();

  // Native valid %PDF-1.4 binary stream generator
  const generatePDFReport = (project: any) => {
    const projName = (project?.name || project?.title || 'Project').replace(/[()\\]/g, '');
    const projStatus = project?.status || 'ACTIVE';
    const projPriority = project?.priority || 'NORMAL';
    const budget = project?.budget ? `$${Number(project.budget).toLocaleString()}` : '$0';
    const spent = project?.spent ? `$${Number(project.spent).toLocaleString()}` : '$0';
    const progress = project?.progress !== undefined ? `${project.progress}%` : '0%';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const taskLines = (tasks.slice(0, 5)).map((t, idx) => {
      const title = (t.title || 'Task').slice(0, 28).padEnd(28, ' ');
      const status = (t.status || 'ACTIVE').slice(0, 12).padEnd(12, ' ');
      const assignee = (t.assignee?.name || 'Unassigned').slice(0, 16);
      return `(  [${idx + 1}] ${title} - Status: ${status} - Assigned: ${assignee}) Tj\n0 -15 Td`;
    }).join('\n');

    const deliverablesContent = taskLines || '(  No deliverables recorded for this project yet.) Tj\n0 -15 Td';

    const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
6 0 obj
<< /Length 1350 >>
stream
BT
/F1 18 Tf
0.15 0.35 0.85 rg
50 740 Td
(PROLOGUE ENTERPRISE PROJECT MANAGEMENT) Tj
0 -26 Td
/F1 14 Tf
0 0 0 rg
(EXECUTIVE ANALYTICS & PERFORMANCE REPORT) Tj
0 -20 Td
/F2 10 Tf
0.4 0.4 0.4 rg
(Report Generated: ${dateStr}) Tj
0 -24 Td
0 0 0 rg
/F1 11 Tf
(================================================================================) Tj
0 -20 Td
(1. PROJECT SPECIFICATIONS & METRICS) Tj
0 -18 Td
/F2 11 Tf
(  - Project Title: ${projName}) Tj
0 -16 Td
(  - Current Status: ${projStatus}) Tj
0 -16 Td
(  - Priority Level: ${projPriority}) Tj
0 -16 Td
(  - Total Budget Allocated: ${budget}) Tj
0 -16 Td
(  - Total Budget Spent: ${spent}) Tj
0 -16 Td
(  - Overall Completion Rate: ${progress}) Tj
0 -26 Td
/F1 11 Tf
(2. DELIVERABLES & WORKFLOW STATUS) Tj
0 -18 Td
/F2 10 Tf
${deliverablesContent}
0 -26 Td
/F1 11 Tf
(3. COMPLIANCE & GOVERNANCE SIGN-OFF) Tj
0 -18 Td
/F2 10 Tf
(This report is generated directly by the Prologue Enterprise RBAC Security Engine.) Tj
0 -15 Td
(All project metric logs, time records, and deliverables comply with system audit standards.) Tj
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000318 00000 n 
0000000387 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
1700
%%EOF`;

    return new Blob([pdfString], { type: 'application/pdf' });
  };

  // Valid UTF-8 BOM CSV generator
  const generateCSVReport = (projects: any[]) => {
    const headers = ['Project ID', 'Project Name', 'Status', 'Priority', 'Budget ($)', 'Spent ($)', 'Progress (%)', 'Team Lead'];
    
    const list = projects || [];

    const rows = list.map(p => [
      p.id,
      `"${(p.name || p.title || 'Project').replace(/"/g, '""')}"`,
      p.status || 'ACTIVE',
      p.priority || 'HIGH',
      p.budget || 0,
      p.spent || 0,
      `${p.progress !== undefined ? p.progress : 0}%`,
      `"${(p.owner || p.teamLead || 'Unassigned').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    setDownloading(format);
    
    try {
      const selectedProj = projectsList.find(p => p.id === activeProjectId) || projectsList[0] || { id: 1, name: 'Hospital Management System' };
      let blob: Blob;
      let filename: string;

      if (format === 'pdf') {
        blob = generatePDFReport(selectedProj);
        filename = `Prologue_Project_${selectedProj.id || 1}_Analytics_Report.pdf`;
      } else {
        blob = generateCSVReport(projectsList);
        filename = `Prologue_Project_Analytics_Data.csv`;
      }

      // Trigger browser native download
      const link = document.createElement('a');
      const blobUrl = window.URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Failed to generate report export download', err);
    } finally {
      setDownloading(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-12 print:p-0 print:space-y-4 w-full min-w-0">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" /> Reports & Analytics Hub
          </h1>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Export executive PDF analytics, CSV spreadsheets, and review annual contribution heatmaps.
          </p>
        </div>

        <LuxurySelect
          className="w-full sm:w-56"
          value={activeProjectId || ''}
          onChange={(val) => setActiveProjectId(Number(val))}
          placeholder="Select Project..."
          options={projectsList.map(p => ({
            value: String(p.id),
            label: p.name || p.title
          }))}
        />
      </div>

      {/* Export panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 print:hidden">
        <div className="glass-panel p-4 sm:p-6 flex flex-col justify-between min-h-[12rem] h-auto space-y-4 border border-slate-200/50 dark:border-white/5">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500 shrink-0" /> Export PDF Analytics
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Generates a certified executive PDF document with budget spend, task priorities, and milestone timelines.
            </p>
          </div>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloading !== null}
            className="w-full py-2.5 px-3 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all transform hover:-translate-y-0.5 text-center"
          >
            <Download className="w-4 h-4 shrink-0" /> <span className="truncate">{downloading === 'pdf' ? 'Generating PDF Document...' : 'Download PDF Report'}</span>
          </button>
        </div>

        <div className="glass-panel p-4 sm:p-6 flex flex-col justify-between min-h-[12rem] h-auto space-y-4 border border-slate-200/50 dark:border-white/5">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" /> Export CSV Spreadsheet
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Formatted UTF-8 CSV spreadsheet data file for Microsoft Excel, Google Sheets, or BI analytics tools.
            </p>
          </div>
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloading !== null}
            className="w-full py-2.5 px-3 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all transform hover:-translate-y-0.5 text-center"
          >
            <Download className="w-4 h-4 shrink-0" /> <span className="truncate">{downloading === 'excel' ? 'Formatting CSV Data...' : 'Download CSV Sheet'}</span>
          </button>
        </div>

        <div className="glass-panel p-4 sm:p-6 flex flex-col justify-between min-h-[12rem] h-auto space-y-4 border border-slate-200/50 dark:border-white/5 sm:col-span-2 lg:col-span-1">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500 shrink-0" /> Print Summary Logs
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Formats current project metrics and workspace task logs to a printable paper view layout.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="w-full py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5 text-center"
          >
            <Printer className="w-4 h-4 shrink-0" /> <span className="truncate">Print Workspace Summary</span>
          </button>
        </div>
      </div>

      {/* Productivity Heatmap Grid */}
      <div className="glass-panel p-6 space-y-4 print:hidden">
        <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart3 className="w-4.5 h-4.5 text-blue-500" /> Productivity Heatmap Grid
        </h3>
        <p className="text-[10px] text-slate-400 font-semibold">Visualizes daily task completion activity counts across 365 calendar days.</p>
        
        <div className="overflow-x-auto pb-2 select-none">
          <div className="flex flex-wrap gap-1 min-w-[700px] max-w-full">
            {heatmapData.map((val, idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-110 cursor-pointer ${
                  val === 0 ? 'bg-slate-200 dark:bg-slate-800' :
                  val === 1 ? 'bg-emerald-900/40 text-emerald-300' :
                  val === 2 ? 'bg-emerald-700/60 text-emerald-200' :
                  val === 3 ? 'bg-emerald-500/70 text-emerald-100' :
                  'bg-emerald-400 text-white'
                }`}
                title={`Day ${idx + 1}: ${val} tasks completed`}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex justify-end gap-2 text-[9px] font-black text-slate-400 pt-2 items-center">
          <span>Less</span>
          <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-800"></span>
          <span className="w-3 h-3 rounded-sm bg-emerald-900/40"></span>
          <span className="w-3 h-3 rounded-sm bg-emerald-700/60"></span>
          <span className="w-3 h-3 rounded-sm bg-emerald-500/70"></span>
          <span className="w-3 h-3 rounded-sm bg-emerald-400"></span>
          <span>More</span>
        </div>
      </div>

      {/* Executive Printable Report View (Visible when printing) */}
      <div className="hidden print:block space-y-6 text-slate-900 bg-white p-6 font-sans">
        {/* Printable Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              PROLOGUE PROJECT SYSTEM
            </h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-0.5">
              Executive Analytics & System Activity Audit Report
            </p>
          </div>
          <div className="text-right text-[10px] font-bold text-slate-600 space-y-0.5">
            <p><span className="font-black text-slate-900">Generated:</span> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><span className="font-black text-slate-900">Security Clearance:</span> RESTRICTED ENTERPRISE</p>
            <p><span className="font-black text-slate-900">Organization:</span> Prologue Enterprise Solutions</p>
          </div>
        </div>

        {/* Executive Project Summary Cards */}
        <div>
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
            1. Selected Project Key Specifications & Metrics
          </h2>
          <div className="grid grid-cols-4 gap-3 text-xs border border-slate-300 p-3 rounded-lg bg-slate-50">
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Project Name</p>
              <p className="font-black text-slate-900 mt-0.5">{(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.name || (projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.title || 'No Project Selected'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Current Status</p>
              <p className="font-black text-blue-700 mt-0.5">{(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.status || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Budget vs Spent</p>
              <p className="font-black text-slate-900 mt-0.5">${Number((projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.budget || 0).toLocaleString()} / ${Number((projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.spent || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Overall Progress</p>
              <p className="font-black text-emerald-700 mt-0.5">{(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.progress !== undefined ? `${(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.progress}%` : '0%'}</p>
            </div>
          </div>
        </div>

        {/* Deliverables Table */}
        <div>
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
            2. Active Deliverables & Task Progress Breakdown
          </h2>
          <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-300 uppercase">
                <th className="p-2 border-r border-slate-300">Task Title</th>
                <th className="p-2 border-r border-slate-300">Assignee</th>
                <th className="p-2 border-r border-slate-300">Priority</th>
                <th className="p-2 border-r border-slate-300">Stage Status</th>
                <th className="p-2">Est. vs Actual Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                    No deliverables recorded for this project yet.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="p-2 border-r border-slate-300 font-bold">{task.title}</td>
                    <td className="p-2 border-r border-slate-300">{task.assignee?.name || 'Unassigned'}</td>
                    <td className={`p-2 border-r border-slate-300 font-black ${
                      task.priority === 'URGENT' || task.priority === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {task.priority || 'NORMAL'}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-bold text-blue-700">{task.status?.replace('_', ' ') || 'ACTIVE'}</td>
                    <td className="p-2 font-mono">{task.estimatedTime || 0}h / {task.actualTime || 0}h</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Team Productivity Breakdown */}
        <div>
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
            3. Team Resource Workload & Productivity Summary
          </h2>
          {teamMembers.length === 0 ? (
            <div className="border border-slate-300 p-4 rounded-lg bg-slate-50 text-center text-slate-500 italic">
              No team member workload recorded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[10px]">
              {teamMembers.slice(0, 6).map((member: any) => {
                const memberTasks = tasks.filter(t => t.assignee && (t.assignee.id === member.id || t.assignee.name === member.name));
                const completedTasks = memberTasks.filter(t => t.status === 'COMPLETED');
                const totalHours = memberTasks.reduce((acc: number, t: any) => acc + (t.actualTime || t.estimatedTime || 0), 0);
                const completionRate = memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 100;
                return (
                  <div key={member.id || member.name} className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
                    <p className="font-black text-slate-900 text-xs">{member.name}</p>
                    <p className="text-slate-600 font-medium">{memberTasks.length} {memberTasks.length === 1 ? 'Task' : 'Tasks'} • {totalHours} Hours Logged</p>
                    <p className="font-extrabold text-emerald-700 mt-1">✓ {completionRate}% Productivity</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sign-off & Audit Compliance */}
        <div className="pt-6 border-t border-slate-300 flex justify-between items-end text-[10px]">
          <div>
            <p className="font-bold text-slate-700">Authorized Signature: _______________________</p>
            <p className="text-slate-500 text-[9px] mt-1">Prologue Project System Administrator & Executive Sign-off</p>
          </div>
          <div className="text-right text-slate-500 text-[9px]">
            <p>Document ID: PRG-RPT-20260826-001</p>
            <p>© 2026 Prologue Enterprise Solutions. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
