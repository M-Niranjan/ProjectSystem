import React from 'react';
import { 
  Palette, 
  Sun, 
  Moon, 
  Check, 
  Sparkles, 
  Layers, 
  Sliders, 
  Eye, 
  Zap, 
  CheckCircle2,
  Plus,
  MessageSquare
} from 'lucide-react';
import { useUIStore, ThemeMode, AccentColor, ACCENT_PRESETS } from '../../store/useUIStore';

interface AppearanceThemeSectionProps {
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function AppearanceThemeSection({ onDirtyChange }: AppearanceThemeSectionProps) {
  const { 
    themeMode, 
    setThemeMode, 
    accentColor, 
    setAccentColor, 
    darkMode,
    glassEffects,
    setGlassEffects,
    livePulse,
    setLivePulse,
    compactMode,
    setCompactMode
  } = useUIStore();

  const handleToggleGlass = (val: boolean) => {
    setGlassEffects(val);
    onDirtyChange?.(true);
  };

  const handleTogglePulse = (val: boolean) => {
    setLivePulse(val);
    onDirtyChange?.(true);
  };

  const handleToggleCompact = (val: boolean) => {
    setCompactMode(val);
    onDirtyChange?.(true);
  };

  const handleThemeSelect = (mode: ThemeMode) => {
    setThemeMode(mode);
    onDirtyChange?.(true);
  };

  const handleAccentSelect = (color: AccentColor) => {
    setAccentColor(color);
    onDirtyChange?.(true);
  };

  const currentPreset = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;

  const accentList: { id: AccentColor; name: string; hex: string; desc: string }[] = [
    { id: 'blue', name: 'Royal Blue', hex: '#3B82F6', desc: 'Classic enterprise blue' },
    { id: 'purple', name: 'Amethyst', hex: '#8B5CF6', desc: 'Creative violet purple' },
    { id: 'green', name: 'Emerald', hex: '#22C55E', desc: 'Fresh success green' },
    { id: 'orange', name: 'Sunset Amber', hex: '#F97316', desc: 'Warm dynamic orange' },
    { id: 'red', name: 'Crimson Rose', hex: '#EF4444', desc: 'High energy crimson' },
    { id: 'teal', name: 'Cyan Teal', hex: '#14B8A6', desc: 'Modern high-tech teal' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Main Glass Container */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white/95 dark:bg-[#0c0e18]/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm backdrop-blur-xl space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-slate-100 dark:border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <span>Appearance &amp; Theme</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize your visual environment, light and dark canvas modes, and active accent color tokens.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Apple iOS Aesthetics</span>
          </div>
        </div>

        {/* 1. CHOOSE THEME — Visual Miniature UI Window Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Choose Interface Theme
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Current: <strong className="text-slate-800 dark:text-slate-200 capitalize">{themeMode}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1.1 LIGHT MODE CARD */}
            <div
              onClick={() => handleThemeSelect('light')}
              className={`group relative rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden ${
                themeMode === 'light'
                  ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {/* Miniature Window Preview */}
              <div className="w-full h-28 rounded-xl bg-[#f8fafc] border border-slate-200/90 shadow-inner overflow-hidden flex flex-col select-none mb-3 pointer-events-none transition-transform group-hover:scale-[1.02]">
                {/* Window Titlebar */}
                <div className="h-4.5 bg-white border-b border-slate-200/80 px-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-slate-200" />
                </div>
                {/* Window Canvas Body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Mini Sidebar */}
                  <div className="w-9 bg-white border-r border-slate-200/80 p-1 space-y-1">
                    <div className="w-4 h-1 rounded bg-indigo-500" />
                    <div className="w-6 h-1 rounded bg-slate-200" />
                    <div className="w-5 h-1 rounded bg-slate-200" />
                    <div className="w-6 h-1 rounded bg-slate-200" />
                  </div>
                  {/* Mini Dashboard Content */}
                  <div className="flex-1 p-1.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-1.5 rounded bg-slate-800" />
                      <div className="w-3 h-3 rounded-full bg-indigo-100" />
                    </div>
                    {/* Mini Stats Row */}
                    <div className="grid grid-cols-3 gap-1">
                      <div className="p-1 rounded bg-white border border-slate-200/80 shadow-2xs">
                        <div className="w-3 h-1 rounded bg-slate-400" />
                        <div className="w-4 h-1.5 rounded bg-indigo-600 mt-0.5" />
                      </div>
                      <div className="p-1 rounded bg-white border border-slate-200/80 shadow-2xs">
                        <div className="w-3 h-1 rounded bg-slate-400" />
                        <div className="w-4 h-1.5 rounded bg-emerald-600 mt-0.5" />
                      </div>
                      <div className="p-1 rounded bg-white border border-slate-200/80 shadow-2xs">
                        <div className="w-3 h-1 rounded bg-slate-400" />
                        <div className="w-4 h-1.5 rounded bg-amber-600 mt-0.5" />
                      </div>
                    </div>
                    {/* Mini Card */}
                    <div className="p-1 rounded bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
                      <div className="w-10 h-1.5 rounded bg-slate-700" />
                      <div className="w-3 h-1 rounded-full bg-emerald-200" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Label & Radio Indicator */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Sun className={`w-4 h-4 ${themeMode === 'light' ? 'text-amber-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Light Mode</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Crisp daylight minimal canvas</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  themeMode === 'light'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-slate-300 dark:border-white/20'
                }`}>
                  {themeMode === 'light' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* 1.2 DARK MODE CARD */}
            <div
              onClick={() => handleThemeSelect('dark')}
              className={`group relative rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden ${
                themeMode === 'dark'
                  ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                  : 'border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              {/* Miniature Window Preview */}
              <div className="w-full h-28 rounded-xl bg-[#07080c] border border-slate-800 shadow-inner overflow-hidden flex flex-col select-none mb-3 pointer-events-none transition-transform group-hover:scale-[1.02]">
                {/* Window Titlebar */}
                <div className="h-4.5 bg-[#0e1019] border-b border-white/[0.06] px-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/60" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <div className="w-12 h-1.5 rounded-full bg-white/10" />
                </div>
                {/* Window Canvas Body */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Mini Sidebar */}
                  <div className="w-9 bg-[#0a0c14] border-r border-white/[0.06] p-1 space-y-1">
                    <div className="w-4 h-1 rounded bg-indigo-400" />
                    <div className="w-6 h-1 rounded bg-white/20" />
                    <div className="w-5 h-1 rounded bg-white/20" />
                    <div className="w-6 h-1 rounded bg-white/20" />
                  </div>
                  {/* Mini Dashboard Content */}
                  <div className="flex-1 p-1.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-1.5 rounded bg-white/90" />
                      <div className="w-3 h-3 rounded-full bg-indigo-500/30" />
                    </div>
                    {/* Mini Stats Row */}
                    <div className="grid grid-cols-3 gap-1">
                      <div className="p-1 rounded bg-white/[0.04] border border-white/[0.06] shadow-2xs">
                        <div className="w-3 h-1 rounded bg-white/40" />
                        <div className="w-4 h-1.5 rounded bg-indigo-400 mt-0.5" />
                      </div>
                      <div className="p-1 rounded bg-white/[0.04] border border-white/[0.06] shadow-2xs">
                        <div className="w-3 h-1 rounded bg-white/40" />
                        <div className="w-4 h-1.5 rounded bg-emerald-400 mt-0.5" />
                      </div>
                      <div className="p-1 rounded bg-white/[0.04] border border-white/[0.06] shadow-2xs">
                        <div className="w-3 h-1 rounded bg-white/40" />
                        <div className="w-4 h-1.5 rounded bg-amber-400 mt-0.5" />
                      </div>
                    </div>
                    {/* Mini Card */}
                    <div className="p-1 rounded bg-white/[0.04] border border-white/[0.06] shadow-2xs flex items-center justify-between">
                      <div className="w-10 h-1.5 rounded bg-white/80" />
                      <div className="w-3 h-1 rounded-full bg-emerald-500/30" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Label & Radio Indicator */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Moon className={`w-4 h-4 ${themeMode === 'dark' ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Dark Obsidian</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Frosted glass &amp; neon accents</span>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                  themeMode === 'dark'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'border border-slate-300 dark:border-white/20'
                }`}>
                  {themeMode === 'dark' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 2. ACCENT COLOR PALETTE (macOS / iOS Style Swatches) */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accent Color Palette
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              Selected: <strong className="text-slate-800 dark:text-slate-200 capitalize">{currentPreset ? accentColor : 'Blue'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {accentList.map((item) => {
              const isSelected = accentColor === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAccentSelect(item.id)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col items-center text-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'border-slate-800 dark:border-white bg-slate-100/90 dark:bg-white/[0.08] shadow-sm scale-102'
                      : 'border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/60 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="relative">
                    <span
                      className="w-7 h-7 rounded-full block shadow-md transition-transform hover:scale-110"
                      style={{ backgroundColor: item.hex }}
                    />
                    {isSelected && (
                      <span className="absolute inset-0 rounded-full flex items-center justify-center text-white ring-2 ring-white dark:ring-black">
                        <Check className="w-3.5 h-3.5 stroke-[3] drop-shadow-sm" />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. INTERFACE CONFIGURATION & LIVE COMPONENT PREVIEW (Side by Side) */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left Column: Toggles */}
          <div className="lg:col-span-6 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Interface Configuration
            </label>

            <div className="space-y-3">
              {/* Toggle 1: Frosted Glass */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Frosted Glass &amp; Blur</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Enable translucency saturation effects</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleGlass(!glassEffects)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    glassEffects ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    glassEffects ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 2: Live Sync Beacon */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Live Sync Beacon</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Show pulsing real-time sync indicators</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePulse(!livePulse)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    livePulse ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    livePulse ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 3: Compact Mode */}
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Compact Interface Spacing</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Higher information density on desktop</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleCompact(!compactMode)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                    compactMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                    compactMode ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Component Preview Card */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                <span>Live Component Preview</span>
              </label>
              <span className="text-[10px] text-slate-400">Updates instantly</span>
            </div>

            {/* Dynamic Preview Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#080a12] border border-slate-200/90 dark:border-white/10 shadow-lg space-y-3.5">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: currentPreset.color }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Project Alpha Pipeline</p>
                    <p className="text-[10px] text-slate-400 font-mono">Workspace: PMS-2026</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  High Priority
                </span>
              </div>

              {/* Sample Task Title */}
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Sprint Delivery &amp; Architecture Modernization
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span 
                    className="px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-colors"
                    style={{ 
                      backgroundColor: currentPreset.light, 
                      color: currentPreset.color,
                      borderColor: `${currentPreset.color}40`
                    }}
                  >
                    In Progress
                  </span>
                  <span className="text-[11px] text-slate-400">Due in 3 days</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span>Sprint Completion</span>
                  <span style={{ color: currentPreset.color }}>75% • 12/16 Steps</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-300"
                    style={{ 
                      width: '75%', 
                      background: currentPreset.gradient,
                      boxShadow: `0 0 10px ${currentPreset.glow}`
                    }}
                  />
                </div>
              </div>

              {/* Sample Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                  style={{ 
                    backgroundColor: currentPreset.color,
                    boxShadow: `0 4px 12px ${currentPreset.glow}`
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 flex items-center gap-1.5 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Discussion</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
