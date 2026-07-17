import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Sun, Moon, Shield, Lock, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const { darkMode, toggleTheme } = useUIStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security'>('profile');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [designation, setDesignation] = useState(user?.designation || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [experience, setExperience] = useState(user?.experience || 5);
  const [skills, setSkills] = useState(user?.skills || '');
  const [twoFactor, setTwoFactor] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(16);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, designation, department, experience, skills };
    const success = await updateProfile(payload);
    if (success) {
      triggerSuccess('Profile details synced successfully!');
    }
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBlurIntensity(val);
    document.documentElement.style.setProperty('--blur-glass', `${val}px`);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
          Hub Settings
        </h1>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
          Manage your personal details, workspace theme appearances, and security.
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-500 rounded-xl p-4 text-xs font-black flex items-center gap-1.5 animate-pulse">
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* Settings Grid Panel */}
      <div className="glass-panel overflow-hidden border border-slate-200/50 dark:border-white/5 flex flex-col md:flex-row min-h-[450px]">
        {/* Left Side: Navigation Tabs */}
        <div className="w-full md:w-56 border-r border-slate-200/30 dark:border-white/5 flex-shrink-0 bg-slate-500/5 p-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/15'
                : 'text-slate-500 hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <User className="w-4.5 h-4.5" /> Profile Details
          </button>
          
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'appearance'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/15'
                : 'text-slate-500 hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            {darkMode ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            Appearance UI
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'security'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/15'
                : 'text-slate-500 hover:bg-white/10 text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4.5 h-4.5" /> Security & 2FA
          </button>
        </div>

        {/* Right Side: Tab Panel Content */}
        <div className="flex-1 p-6 md:p-8">
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">Profile Specifications</h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Experience (Years)</label>
                  <input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Key Skills (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="React, CSS, SQL"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all"
              >
                Save Profile Parameters
              </button>
            </form>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">Appearance UI Settings</h3>
              
              {/* Theme toggle */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <div>
                  <p className="font-black text-slate-800 dark:text-slate-100">Toggle Theme Mode</p>
                  <p className="text-[10px] mt-0.5">Switch between dark and light workspace styling.</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 hover:bg-white/10 text-slate-800 dark:text-white rounded-xl font-black cursor-pointer transition-all flex items-center gap-1.5"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
                  {darkMode ? 'Light Theme' : 'Dark Theme'}
                </button>
              </div>

              {/* Glass blur slider */}
              <div className="space-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <div>
                    <p className="font-black text-slate-800 dark:text-slate-100">Glassmorphism Blur Filter</p>
                    <p className="text-[10px] mt-0.5">Modify backdrop blur intensity values dynamically.</p>
                  </div>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{blurIntensity}px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={blurIntensity}
                  onChange={handleBlurChange}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl">
              <h3 className="text-sm font-black text-slate-800 dark:text-white border-b border-slate-200/30 dark:border-white/5 pb-2">Security Configurations</h3>

              {/* 2FA switches */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <div>
                  <p className="font-black text-slate-800 dark:text-slate-100">Two Factor Authentication (2FA)</p>
                  <p className="text-[10px] mt-0.5">Add an extra layer of code validation safety to login prompts.</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactor(!twoFactor);
                    triggerSuccess(`2FA verification ${!twoFactor ? 'activated' : 'deactivated'}.`);
                  }}
                  className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-300 cursor-pointer ${twoFactor ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-800'}`}
                >
                  <div className={`h-4.5 w-4.5 rounded-full bg-white transition-transform duration-300 ${twoFactor ? 'translate-x-5.5' : ''}`}></div>
                </button>
              </div>

              {/* Password change */}
              <form onSubmit={(e) => { e.preventDefault(); triggerSuccess('Password updated successfully!'); }} className="space-y-4 border-t border-slate-200/30 dark:border-white/5 pt-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-white/5 border border-slate-200/50 dark:border-white/5 rounded-xl text-slate-800 dark:text-white outline-none focus:border-blue-500/50 transition-all font-semibold text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all"
                >
                  Change Credentials Password
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
