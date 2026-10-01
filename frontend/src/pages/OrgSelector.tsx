import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Shield,
  Briefcase,
  Users,
  Search,
  ArrowRight,
  LogOut,
  Sparkles,
  Layers,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore, OrgMembership } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { getDashboardPathForRole, normalizeRole } from '../services/authRoles';
import { resolveAvatar } from '../services/avatar';

export default function OrgSelector() {
  const navigate = useNavigate();
  const { user, orgMemberships, setActiveOrganization, logout, fetchMyOrganizations } = useAuthStore();
  const { setSignOutModalOpen } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingOrgId, setLoadingOrgId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOrgs = (orgMemberships || []).filter((org) => {
    const q = searchTerm.toLowerCase();
    return (
      org.organizationName?.toLowerCase().includes(q) ||
      org.organizationCode?.toLowerCase().includes(q) ||
      org.role?.toLowerCase().includes(q)
    );
  });

  const handleSelectOrg = async (org: OrgMembership) => {
    setLoadingOrgId(org.organizationId);
    try {
      await setActiveOrganization(org.organizationId);
      const role = normalizeRole(org.roleCode || org.role || user?.role);
      if (!role) {
        useAuthStore.setState({
          error: 'Your account role could not be verified. Please contact your administrator.',
        });
        return;
      }
      const targetPath = getDashboardPathForRole(role);
      if (!targetPath) {
        useAuthStore.setState({
          error: 'Your account role could not be verified. Please contact your administrator.',
        });
        return;
      }
      navigate(targetPath, { replace: true });
    } catch (err) {
      console.error('Failed to select organization:', err);
    } finally {
      setLoadingOrgId(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMyOrganizations();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getRoleBadge = (roleCodeOrStr?: string) => {
    const r = normalizeRole(roleCodeOrStr);
    if (r === 'ROLE_ADMIN') {
      return {
        label: 'Administrator',
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        icon: Shield,
      };
    }
    if (r === 'ROLE_MANAGER') {
      return {
        label: 'Team Leader',
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        icon: Briefcase,
      };
    }
    return {
      label: 'Employee',
      bg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      icon: Users,
    };
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-10 bg-slate-50 dark:bg-[#07090e]">
      {/* Background blueprint overlay */}
      <div className="blueprint-grid-overlay" aria-hidden="true" />

      {/* Header bar */}
      <header className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-1 h-8">
            <div className="w-2.5 h-4 rounded-sm bg-blue-400 shadow-sm" />
            <div className="w-2.5 h-6 rounded-sm bg-blue-500 shadow-sm" />
            <div className="w-2.5 h-8 rounded-sm bg-blue-600 shadow-sm" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Task<span className="text-blue-600 dark:text-blue-400">Flow</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400">
                Multi-Tenant
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Project Management System</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300/60 dark:border-white/10">
              <img
                src={resolveAvatar(user.profilePhoto, user.name, user.gender)}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
            </div>
            <button
              onClick={() => setSignOutModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-5xl mx-auto py-8 sm:py-12 my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-xl mx-auto mb-8 sm:mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome Back</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Choose Your Workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
            Your account belongs to multiple organizations. Select a workspace to access its projects, tasks, and team tracking.
          </p>
        </motion.div>

        {/* Search and Refresh bar */}
        {orgMemberships && orgMemberships.length > 2 && (
          <div className="max-w-md mx-auto mb-8 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-blue-500 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-inner"
              />
            </div>
            <button
              onClick={handleRefresh}
              className={`p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0 ${
                isRefreshing ? 'animate-spin text-blue-500' : ''
              }`}
              title="Refresh organizations list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Organizations Grid */}
        {filteredOrgs.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
          >
            {filteredOrgs.map((org) => {
              const badge = getRoleBadge(org.roleCode || org.role);
              const BadgeIcon = badge.icon;
              const isLoading = loadingOrgId === org.organizationId;

              return (
                <motion.div
                  key={org.organizationId}
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => !isLoading && handleSelectOrg(org)}
                  className="group relative cursor-pointer glass-panel p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] transition-all overflow-hidden flex flex-col justify-between bg-white/80 dark:bg-slate-900/60"
                >
                  {/* Subtle hover gradient glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div>
                    {/* Top Row: Icon + Role Badge */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:border-blue-500/30 transition-colors shadow-inner flex-shrink-0">
                        <Building2 className="w-6 h-6 stroke-[1.75]" />
                      </div>

                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${badge.bg}`}
                      >
                        <BadgeIcon className="w-3 h-3 stroke-[2]" />
                        <span>{badge.label}</span>
                      </div>
                    </div>

                    {/* Organization Title */}
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {org.organizationName || org.organizationId}
                    </h3>

                    {/* Org Code / Metadata */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Workspace:</span>
                      <span className="font-mono text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                        {org.organizationCode || org.organizationId}
                      </span>
                      {org.department && (
                        <>
                          <span>•</span>
                          <span className="truncate">{org.department}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Bottom Action Row */}
                  <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    <span className="text-xs font-semibold">Enter Workspace</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-white/5 group-hover:bg-blue-600 text-blue-600 dark:text-slate-300 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                      {isLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="glass-panel p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-white/10 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 mx-auto mb-4">
              <Building2 className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Organizations Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {searchTerm
                ? 'No organization matches your search criteria.'
                : 'Your user account is not currently assigned to any workspace organization. Please contact your system administrator.'}
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              ) : (
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto pt-6 text-center border-t border-slate-200 dark:border-white/5">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          TaskFlow Multi-Organization Architecture &bull; Complete Data Isolation Guaranteed
        </p>
      </footer>
    </div>
  );
}
