import { create } from 'zustand';

interface LiveRefreshState {
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  refreshCount: number;
  triggerRefresh: () => void;
}

export const useLiveRefreshStore = create<LiveRefreshState>((set, get) => {
  return {
    isRefreshing: false,
    lastRefreshedAt: new Date(),
    refreshCount: 0,

    triggerRefresh: () => {
      // Prevent spamming during an active refresh
      if (get().isRefreshing) return;

      set({ isRefreshing: true });
      const now = new Date();

      // Dispatch global event for all views to refresh live
      try {
        window.dispatchEvent(new CustomEvent('app-live-refresh', { detail: { timestamp: now } }));
      } catch (_err) {
        window.dispatchEvent(new Event('app-live-refresh'));
      }

      // Smooth spin animation feedback
      setTimeout(() => {
        set((state) => ({
          isRefreshing: false,
          lastRefreshedAt: now,
          refreshCount: state.refreshCount + 1,
        }));
      }, 650);
    },
  };
});
