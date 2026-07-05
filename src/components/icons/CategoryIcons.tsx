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

/** Gerade angesagt → flame. */
export function FlameIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 2.5c1 3-3.5 4.2-3.5 8a3.5 3.5 0 0 0 7 0c0-1.4-.7-2.2-1.2-3 .8.2 2.7 1.6 2.7 4.6a5 5 0 0 1-10 0c0-4.6 3.7-6 5-9.6z" />
    </svg>
  );
}

/** Neu diese Season → four-point sparkle. */
export function SparkleIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3c.6 3.8 2.2 5.4 6 6-3.8.6-5.4 2.2-6 6-.6-3.8-2.2-5.4-6-6 3.8-.6 5.4-2.2 6-6z" />
      <path d="M19 16.5c.25 1.4.85 2 2.25 2.25-1.4.25-2 .85-2.25 2.25-.25-1.4-.85-2-2.25-2.25 1.4-.25 2-.85 2.25-2.25z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Beste Bewertung → five-point star. */
export function StarIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 3.5l2.36 4.78 5.28.77-3.82 3.72.9 5.26L12 15.6l-4.72 2.43.9-5.26-3.82-3.72 5.28-.77z" />
    </svg>
  );
}

/** Am beliebtesten → heart. */
export function HeartIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M12 20s-7-4.4-9.3-8.8C1.3 8 3 4.8 6.2 4.8c1.9 0 3.3 1.1 3.8 2.3.5-1.2 1.9-2.3 3.8-2.3 3.2 0 4.9 3.2 3.5 6.4C19 15.6 12 20 12 20z" />
    </svg>
  );
}

/** "Alle"-Filter → 2x2 grid. */
export function GridIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/** "Serien"-Filter → TV set. */
export function TvIcon(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M8 6l4-3.2L16 6" />
      <path d="M8 19v1.5M16 19v1.5" />
    </svg>
  );
}
