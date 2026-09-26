import { useEffect } from 'react';

/**
 * Prevents background scrolling, layout shifts, and rubber-band shaking when a modal/popup/sidebar drawer is open.
 * Rock-solid implementation for both desktop and mobile touch devices (Android, iOS Safari, WebViews).
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    // Capture current scroll offset
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Save original styles
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // Pin body to viewport at current scroll position to freeze background 100% constant
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    // Prevent touchmove events that target outside scrollable areas
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Allow touch scrolling ONLY inside elements explicitly marked as scrollable
      const scrollableContainer = target.closest(
        '.sidebar-scrollable-nav, [data-scrollable="true"], .overflow-y-auto, .overflow-auto'
      ) as HTMLElement | null;

      if (!scrollableContainer) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);

      // Restore body and html styles
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;

      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;

      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [lock]);
}
