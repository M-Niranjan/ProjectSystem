import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useLiveRefreshStore } from '../store/useLiveRefreshStore';

export default function LiveRefreshControl() {
  const { isRefreshing, triggerRefresh, lastRefreshedAt } = useLiveRefreshStore();

  const formatLastUpdated = () => {
    if (!lastRefreshedAt) return 'Ready to sync';
    const secondsAgo = Math.max(0, Math.floor((Date.now() - new Date(lastRefreshedAt).getTime()) / 1000));
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const mins = Math.floor(secondsAgo / 60);
    return `${mins}m ago`;
  };

  return (
    <button
      type="button"
      disabled={isRefreshing}
      onClick={() => triggerRefresh()}
      className={`group h-8.5 sm:h-9 px-2.5 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 rounded-full border transition-all cursor-pointer select-none shadow-xs active:scale-95 flex-shrink-0 ${
        isRefreshing
          ? 'bg-blue-500/15 border-blue-500/40 text-blue-600 dark:text-blue-400'
          : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:border-blue-500/30'
      }`}
      title={`Live Refresh Workspace (Last updated: ${formatLastUpdated()}). Click to refresh all views.`}
    >
      {/* Live Beacon Dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isRefreshing ? 'bg-blue-400' : 'bg-emerald-400'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isRefreshing ? 'bg-blue-500' : 'bg-emerald-500'
        }`}></span>
      </span>

      {/* Rotating Refresh Icon */}
      <RefreshCw
        className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 ${
          isRefreshing
            ? 'animate-spin text-blue-500 dark:text-blue-400'
            : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:rotate-180'
        }`}
      />

      {/* Button Text - Hidden on mobile, visible on tablet/desktop */}
      <span className="hidden md:inline text-xs font-bold tracking-tight">
        {isRefreshing ? 'Refreshing...' : 'Live Refresh'}
      </span>
    </button>
  );
}
