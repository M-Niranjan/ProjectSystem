# Style 1: Frosted Glassmorphism Code Guide (Linear / Vercel Standard)

Here is the complete, copy-paste ready code implementation for **Style 1: Frosted Glassmorphism**.

---

## 1. CSS Design Tokens & Glass Utility Classes (`index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@layer base {
  :root {
    --bg-main: #ffffff;
    --bg-card: rgba(255, 255, 255, 0.80);
    --bg-card-hover: rgba(255, 255, 255, 0.92);
    --border-glass: rgba(0, 0, 0, 0.08);
    --border-glass-highlight: rgba(0, 0, 0, 0.16);
    --text-primary: #0f172a;
    --font-heading: 'Plus Jakarta Sans', sans-serif;
    --font-body: 'Inter', sans-serif;
  }

  /* DARK OBSIDIAN THEME - Style 1 (Linear / Vercel Frosted Glassmorphism) */
  .dark, :root.dark {
    --bg-main: #0a0b0f;
    --bg-card: rgba(18, 20, 29, 0.65);
    --bg-card-hover: rgba(28, 30, 44, 0.85);
    --bg-navbar: rgba(10, 11, 15, 0.80);
    --bg-sidebar: rgba(10, 11, 15, 0.85);
    --bg-input: rgba(255, 255, 255, 0.04);
    
    --border-glass: rgba(255, 255, 255, 0.08);
    --border-glass-highlight: rgba(56, 189, 248, 0.35);
    --border-subtle: rgba(255, 255, 255, 0.05);
    --border-focus: rgba(56, 189, 248, 0.6);
    
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-tertiary: #64748b;
    
    --shadow-glass: 0 8px 32px 0 rgba(0, 0, 0, 0.37), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    --shadow-hover: 0 12px 40px 0 rgba(56, 189, 248, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.16) inset;
    --blur-glass: 16px;
  }

  body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
  }
}

/* Glassmorphic Panel Base */
.glass-panel {
  background: var(--bg-card);
  backdrop-filter: blur(var(--blur-glass)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(180%);
  border: 1px solid var(--border-glass);
  box-shadow: var(--shadow-glass);
  border-radius: 20px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Style 1 Interactive Dashboard Card */
.glass-card-dashboard {
  background: var(--bg-card);
  backdrop-filter: blur(var(--blur-glass)) saturate(180%);
  -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(180%);
  border: 1px solid var(--border-glass);
  box-shadow: var(--shadow-glass);
  border-radius: 18px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.glass-card-dashboard:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-glass-highlight);
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}
```

---

## 2. React Admin Dashboard Component (`Dashboard.tsx`)

```tsx
import React from 'react';
import { 
  Shield, 
  Sparkles, 
  ArrowUpRight, 
  UserCheck, 
  ShieldCheck, 
  Building2, 
  Sliders, 
  ScrollText,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function Style1Dashboard() {
  return (
    <div className="space-y-6 w-full p-6 bg-[#0a0b0f] text-slate-100 min-h-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-400" /> Admin Dashboard
          </h1>
          <p className="text-sm font-semibold text-slate-400 mt-1">
            Welcome back, <span className="text-slate-200 font-bold">Niranjan</span>! Roles: <span className="font-extrabold text-sky-400">ADMIN</span>
          </p>
        </div>
      </div>

      {/* 4 Metric Stat Cards (Style 1 Glassmorphism) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Active Projects */}
        <div className="glass-card-dashboard group p-5 flex flex-col justify-between cursor-pointer hover:border-amber-500/40">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              LIVE
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Projects</p>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">2</h3>
            <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Hospital, SaaS
            </p>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className="glass-card-dashboard group p-5 flex flex-col justify-between cursor-pointer hover:border-emerald-500/40">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              DONE
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed</p>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">0</h3>
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              On-Time Delivery
            </p>
          </div>
        </div>

        {/* Card 3: Total Teams */}
        <div className="glass-card-dashboard group p-5 flex flex-col justify-between cursor-pointer hover:border-sky-500/40">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
              TEAMS
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Teams</p>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">3</h3>
            <p className="text-xs font-semibold text-sky-400 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Engineering, QA
            </p>
          </div>
        </div>

        {/* Card 4: Total Users */}
        <div className="glass-card-dashboard group p-5 flex flex-col justify-between cursor-pointer hover:border-purple-500/40">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              RBAC
            </span>
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Users</p>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">5</h3>
            <p className="text-xs font-semibold text-purple-400 flex items-center gap-1.5 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              RBAC Active
            </p>
          </div>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" /> System Modules Navigation
          </h3>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Actions</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          
          {/* Module 1: User Directory */}
          <div className="glass-card-dashboard group p-4 flex flex-col justify-between cursor-pointer hover:border-red-500/40">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-red-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">User Directory</p>
              <p className="text-[10px] text-slate-400">Create & assign roles</p>
            </div>
          </div>

          {/* Module 2: Roles & Perms */}
          <div className="glass-card-dashboard group p-4 flex flex-col justify-between cursor-pointer hover:border-blue-500/40">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Roles & Perms</p>
              <p className="text-[10px] text-slate-400">RBAC matrix</p>
            </div>
          </div>

          {/* Module 3: Org Settings */}
          <div className="glass-card-dashboard group p-4 flex flex-col justify-between cursor-pointer hover:border-sky-500/40">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Org Settings</p>
              <p className="text-[10px] text-slate-400">Working defaults</p>
            </div>
          </div>

          {/* Module 4: Teams Config */}
          <div className="glass-card-dashboard group p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-500/40">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Teams Config</p>
              <p className="text-[10px] text-slate-400">Assign Team Leads</p>
            </div>
          </div>

          {/* Module 5: Audit Logs */}
          <div className="glass-card-dashboard group p-4 flex flex-col justify-between cursor-pointer hover:border-emerald-500/40">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <ScrollText className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
            <div className="mt-4 space-y-0.5">
              <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">Audit Logs</p>
              <p className="text-[10px] text-slate-400">Security history</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
```
