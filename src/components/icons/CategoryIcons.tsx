import type { SVGProps } from 'react';

/**
 * Hand-made line icons matching the app look (2px stroke, rounded joins).
 * All use `currentColor` so callers set the color via a text-* class.
 */
type IconProps = SVGProps<SVGSVGElement>;

const baseProps: IconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** Geschaut → circle with a check ("done"). */
export function WatchedIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.6 2.6 5.4-5.4" />
    </svg>
  );
}

/** Gerade am Schauen → rounded square with a play triangle. */
export function PlayIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M10 8.4v7.2l5.6-3.6z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A bare play triangle (for icon-only buttons). */
export function PlayGlyph(props: IconProps) {
  return (
    <svg {...baseProps} {...props} strokeWidth={0}>
      <path d="M8 6.5v11l9-5.5z" fill="currentColor" />
    </svg>
  );
}

/** Fortsetzung folgt → double chevron ("what comes next"). */
export function NextIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M7 6l6 6-6 6" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

/** Entdecken → compass with a needle. */
export function CompassIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5.2-5.2 2 2-5.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Fallback glyph for missing covers. */
export function FilmIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}
