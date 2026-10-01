import { useEffect, useRef } from 'react';
import { useLiveRefreshStore } from '../store/useLiveRefreshStore';

/**
 * Hook to subscribe any component or page to the global Live Refresh cycle.
 * Whenever auto-refresh ticks, manual refresh is clicked, or the user switches back
 * to the browser tab, the provided callback will be executed.
 */
export function useLiveRefresh(
  callback: () => void | Promise<void>,
  options: { enabled?: boolean } = { enabled: true }
) {
  const savedCallback = useRef(callback);
  const isRefreshing = useLiveRefreshStore((s) => s.isRefreshing);
  const lastRefreshedAt = useLiveRefreshStore((s) => s.lastRefreshedAt);

  // Keep latest callback ref to avoid stale closures
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (options.enabled === false) return;

    const handleRefresh = () => {
      try {
        const result = savedCallback.current();
        if (result && typeof (result as any).catch === 'function') {
          (result as any).catch((err: any) => {
            console.warn('[LiveRefresh] Page refresh handler error:', err);
          });
        }
      } catch (err) {
        console.warn('[LiveRefresh] Page refresh callback exception:', err);
      }
    };

    window.addEventListener('app-live-refresh', handleRefresh);
    return () => {
      window.removeEventListener('app-live-refresh', handleRefresh);
    };
  }, [options.enabled]);

  return { isRefreshing, lastRefreshedAt };
}
