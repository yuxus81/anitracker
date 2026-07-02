import { useEffect } from 'react';

/**
 * Robust body scroll lock for modals. Instead of the fragile position:fixed +
 * scroll-restore trick (which janks on iOS), we simply toggle a class that sets
 * `overflow:hidden` and compensate for the scrollbar width to avoid layout shift.
 * A counter allows multiple stacked modals to lock safely.
 */
let lockCount = 0;

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    lockCount += 1;
    const { body } = document;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (lockCount === 1) {
      body.classList.add('scroll-locked');
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        body.classList.remove('scroll-locked');
        body.style.paddingRight = '';
      }
    };
  }, [active]);
}
