import { useEffect } from 'react';

/**
 * Global Reference-Counted Scroll Lock
 * Completely freezes background movement across desktop, trackpads, mobile browsers, iOS Safari, Android WebViews & Capacitor.
 * Prevents rubber-banding, scroll-chaining, backdrop touch gestures, and wheel-bubbling.
 */

let activeLocks = 0;
let savedScrollY = 0;
let originalStyles = {
  bodyPosition: '',
  bodyTop: '',
  bodyLeft: '',
  bodyRight: '',
  bodyWidth: '',
  bodyOverflow: '',
  bodyOverscroll: '',
  htmlOverflow: '',
  htmlOverscroll: '',
};

let touchStartY = 0;

function handleTouchStart(e: TouchEvent) {
  if (e.touches && e.touches.length > 0) {
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchMove(e: TouchEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  // Check if target is inside an explicitly scrollable container
  const scrollable = target.closest(
    '.sidebar-scrollable-nav, [data-scrollable="true"], .overflow-y-auto, .overflow-auto'
  ) as HTMLElement | null;

  if (!scrollable) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  // If container content does not exceed its visible height, prevent touch drag from scrolling background
  if (scrollable.scrollHeight <= scrollable.clientHeight) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  // Container is scrollable: prevent overscroll chaining at edges
  const currentY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : 0;
  const deltaY = currentY - touchStartY;
  const isAtTop = scrollable.scrollTop <= 0;
  const isAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

  if (isAtTop && deltaY > 0) {
    // Attempting to scroll down while already at the top
    if (e.cancelable) e.preventDefault();
  } else if (isAtBottom && deltaY < 0) {
    // Attempting to scroll up while already at the bottom
    if (e.cancelable) e.preventDefault();
  }
}

function handleWheel(e: WheelEvent) {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const scrollable = target.closest(
    '.sidebar-scrollable-nav, [data-scrollable="true"], .overflow-y-auto, .overflow-auto'
  ) as HTMLElement | null;

  if (!scrollable) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  if (scrollable.scrollHeight <= scrollable.clientHeight) {
    if (e.cancelable) e.preventDefault();
    return;
  }

  const isAtTop = scrollable.scrollTop <= 0;
  const isAtBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

  if (isAtTop && e.deltaY < 0) {
    if (e.cancelable) e.preventDefault();
  } else if (isAtBottom && e.deltaY > 0) {
    if (e.cancelable) e.preventDefault();
  }
}

function enableScrollLock() {
  if (activeLocks === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    originalStyles = {
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverflow: document.documentElement.style.overflow,
      htmlOverscroll: document.documentElement.style.overscrollBehavior,
    };

    // Pin body to current viewport position to freeze background 100% constant
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    document.body.classList.add('modal-scroll-locked');

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('wheel', handleWheel, { passive: false });
  }

  activeLocks += 1;
}

function disableScrollLock() {
  activeLocks = Math.max(0, activeLocks - 1);

  if (activeLocks === 0) {
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('wheel', handleWheel);

    document.body.style.position = originalStyles.bodyPosition;
    document.body.style.top = originalStyles.bodyTop;
    document.body.style.left = originalStyles.bodyLeft;
    document.body.style.right = originalStyles.bodyRight;
    document.body.style.width = originalStyles.bodyWidth;
    document.body.style.overflow = originalStyles.bodyOverflow;
    document.body.style.overscrollBehavior = originalStyles.bodyOverscroll;

    document.documentElement.style.overflow = originalStyles.htmlOverflow;
    document.documentElement.style.overscrollBehavior = originalStyles.htmlOverscroll;

    document.body.classList.remove('modal-scroll-locked');

    // Restore exact scroll position without layout jumping
    window.scrollTo(0, savedScrollY);
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
