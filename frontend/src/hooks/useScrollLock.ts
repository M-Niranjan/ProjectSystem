import { useEffect } from 'react';

/**
 * Clean Non-Destructive Scroll Lock for Modals & Overlays
 * Allows background scrolling to be safely paused when a modal is open,
 * and immediately restored when closed or on navigation.
 * Never freezes or permanently blocks document movement.
 */

let activeLocks = 0;

export function forceUnlockAllScroll() {
  activeLocks = 0;
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-scroll-locked');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';
    if (document.documentElement) {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
  }
}

function enableScrollLock() {
  activeLocks += 1;
  if (activeLocks === 1 && typeof document !== 'undefined') {
    document.body.classList.add('modal-scroll-locked');
    document.body.style.overflow = 'hidden';
  }
}

function disableScrollLock() {
  activeLocks = Math.max(0, activeLocks - 1);
  if (activeLocks === 0 && typeof document !== 'undefined') {
    document.body.classList.remove('modal-scroll-locked');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.overscrollBehavior = '';
    if (document.documentElement) {
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
  }
}

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    enableScrollLock();

    return () => {
      disableScrollLock();
    };
  }, [lock]);
}
