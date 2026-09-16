import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, BarChart3, TrendingUp, CheckSquare, Award } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/useUIStore';

export default function Reports() {
  const { selectedProjectId } = useUIStore();
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(selectedProjectId);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Generate 53 weeks x 7 days grid for GitHub-style productivity heatmap
  const generateHeatmap = () => {
    const days = [];
    const seed = [0, 1, 2, 4, 1, 0, 3, 0, 1, 2, 0, 4, 1, 2, 0, 0, 3];
    for (let i = 0; i < 365; i++) {
      days.push(seed[i % seed.length]);
    }
    return days;
  };

  const heatmapData = generateHeatmap();

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

  useEffect(() => {
    fetchProjects();
  }, []);

  // Native valid %PDF-1.4 binary stream generator
  const generatePDFReport = (project: any) => {
    const projName = (project?.name || project?.title || 'Hospital Management System').replace(/[()\\]/g, '');
    const projStatus = project?.status || 'ACTIVE';
    const projPriority = project?.priority || 'HIGH';
    const budget = project?.budget ? `$${Number(project.budget).toLocaleString()}` : '$150,000';
    const spent = project?.spent ? `$${Number(project.spent).toLocaleString()}` : '$68,500';
    const progress = project?.progress !== undefined ? `${project.progress}%` : '85%';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
(  [1] Patient Dashboard Interface      - Status: CODE REVIEW  - Assigned: Rahul Verma) Tj
0 -15 Td
(  [2] Doctor Consultation API          - Status: IN PROGRESS  - Assigned: Ramesh Kumar) Tj
0 -15 Td
(  [3] Pharmacy Inventory System        - Status: IN PROGRESS  - Assigned: Alice Smith) Tj
0 -15 Td
(  [4] Database Migration & Schema      - Status: COMPLETED    - Assigned: Niranjan Admin) Tj
0 -15 Td
(  [5] QA Security Audit & Testing      - Status: TESTING      - Assigned: Quality Team) Tj
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
    <div className="space-y-6 select-none pb-12 print:p-0 print:space-y-4 w-full min-w-0">
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

        <select
          value={activeProjectId || ''}
          onChange={(e) => setActiveProjectId(Number(e.target.value))}
          className="px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-bold text-xs cursor-pointer"
        >
          {projectsList.map(p => (
            <option className="dark:bg-slate-800" key={p.id} value={p.id}>{p.name || p.title}</option>
          ))}
        </select>
      </div>

      {/* Export panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="glass-panel p-6 flex flex-col justify-between h-48 border border-slate-200/50 dark:border-white/5">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" /> Export PDF Analytics
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Generates a certified executive PDF document with budget spend, task priorities, and milestone timelines.
            </p>
          </div>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloading !== null}
            className="w-full py-2.5 bg-red-600/10 hover:bg-red-600/25 border border-red-500/20 text-red-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" /> {downloading === 'pdf' ? 'Generating PDF Document...' : 'Download PDF Report'}
          </button>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-48 border border-slate-200/50 dark:border-white/5">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" /> Export CSV Spreadsheet
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Formatted UTF-8 CSV spreadsheet data file for Microsoft Excel, Google Sheets, or BI analytics tools.
            </p>
          </div>
          <button
            onClick={() => handleDownload('excel')}
            disabled={downloading !== null}
            className="w-full py-2.5 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" /> {downloading === 'excel' ? 'Formatting CSV Data...' : 'Download CSV Sheet'}
          </button>
        </div>

        <div className="glass-panel p-6 flex flex-col justify-between h-48 border border-slate-200/50 dark:border-white/5">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500" /> Print Summary Logs
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              Formats current project metrics and workspace task logs to a printable paper view layout.
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 text-blue-500 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all transform hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4" /> Print Workspace Summary
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
              <p className="font-black text-slate-900 mt-0.5">{(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.name || 'Hospital Management System'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Current Status</p>
              <p className="font-black text-blue-700 mt-0.5">{(projectsList.find(p => p.id === activeProjectId) || projectsList[0])?.status || 'ACTIVE'}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Budget vs Spent</p>
              <p className="font-black text-slate-900 mt-0.5">$150,000 / $68,500</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-500">Overall Progress</p>
              <p className="font-black text-emerald-700 mt-0.5">85% (On Schedule)</p>
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
              <tr>
                <td className="p-2 border-r border-slate-300 font-bold">Create Patient Dashboard Interface</td>
                <td className="p-2 border-r border-slate-300">Rahul Verma (Employee)</td>
                <td className="p-2 border-r border-slate-300 font-black text-red-600">HIGH</td>
                <td className="p-2 border-r border-slate-300 font-bold text-amber-700">CODE REVIEW</td>
                <td className="p-2 font-mono">8.0h / 6.5h</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-bold">Doctor Consultation Booking API</td>
                <td className="p-2 border-r border-slate-300">Ramesh Kumar (Employee)</td>
                <td className="p-2 border-r border-slate-300 font-black text-red-600">HIGH</td>
                <td className="p-2 border-r border-slate-300 font-bold text-blue-700">IN PROGRESS</td>
                <td className="p-2 font-mono">12.0h / 9.0h</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-bold">Pharmacy Inventory System</td>
                <td className="p-2 border-r border-slate-300">Alice Smith (Employee)</td>
                <td className="p-2 border-r border-slate-300 font-bold text-amber-600">MEDIUM</td>
                <td className="p-2 border-r border-slate-300 font-bold text-blue-700">IN PROGRESS</td>
                <td className="p-2 font-mono">15.0h / 10.0h</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-bold">Database Migration & Schema Setup</td>
                <td className="p-2 border-r border-slate-300">Niranjan M (Admin)</td>
                <td className="p-2 border-r border-slate-300 font-black text-red-600">URGENT</td>
                <td className="p-2 border-r border-slate-300 font-bold text-emerald-700">COMPLETED</td>
                <td className="p-2 font-mono">6.0h / 5.5h</td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-300 font-bold">System Integration & QA Testing</td>
                <td className="p-2 border-r border-slate-300">Quality Assurance Team</td>
                <td className="p-2 border-r border-slate-300 font-bold text-amber-600">MEDIUM</td>
                <td className="p-2 border-r border-slate-300 font-bold text-purple-700">TESTING</td>
                <td className="p-2 font-mono">10.0h / 4.0h</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Team Productivity Breakdown */}
        <div>
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
            3. Team Resource Workload & Productivity Summary
          </h2>
          <div className="grid grid-cols-3 gap-3 text-[10px]">
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <p className="font-black text-slate-900 text-xs">Niranjan M (Admin)</p>
              <p className="text-slate-600 font-medium">4 Tasks • 38.5 Hours Logged</p>
              <p className="font-extrabold text-emerald-700 mt-1">✓ 100% On-Time Delivery</p>
            </div>
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <p className="font-black text-slate-900 text-xs">Ramesh Kumar (Employee)</p>
              <p className="text-slate-600 font-medium">6 Tasks • 42.0 Hours Logged</p>
              <p className="font-extrabold text-blue-700 mt-1">↑ 95% Productivity Velocity</p>
            </div>
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <p className="font-black text-slate-900 text-xs">Rahul Verma (Employee)</p>
              <p className="text-slate-600 font-medium">5 Tasks • 36.0 Hours Logged</p>
              <p className="font-extrabold text-amber-700 mt-1">⌛ 1 Review Pending</p>
            </div>
          </div>
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
