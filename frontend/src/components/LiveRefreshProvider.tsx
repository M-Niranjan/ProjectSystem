import React, { useEffect } from 'react';
import { useLiveRefreshStore } from '../store/useLiveRefreshStore';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Top-level provider for Live Refresh.
 * Listens for network reconnects and keeps workspace in sync.
 */
export default function LiveRefreshProvider({ children }: { children?: React.ReactNode }) {
  const { triggerRefresh } = useLiveRefreshStore();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!token || !user) return;

    const handleOnline = () => {
      triggerRefresh();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [token, !!user]);

  return <>{children}</>;
}
