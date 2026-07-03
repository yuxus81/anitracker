import { useEffect } from 'react';

/** Convert `#rrggbb` + alpha into an `rgba()` string. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Sets the app's `--theme-glow` CSS variable (the soft radial background glow)
 * to the given accent while the calling page is mounted, then resets it on
 * unmount so the next page can set its own.
 */
export function useThemeGlow(hex: string, alpha = 0.13): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-glow', hexToRgba(hex, alpha));
    return () => {
      root.style.setProperty('--theme-glow', 'transparent');
    };
  }, [hex, alpha]);
}
