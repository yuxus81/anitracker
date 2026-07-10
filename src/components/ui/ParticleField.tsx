import { useMemo, type CSSProperties } from 'react';
import { cn } from '@/utils/cn';

export type ParticleShape = 'heart' | 'star' | 'orb';

/** A themed particle motif for a popup: hearts for Romance, stars for Fantasy… */
export interface PopupAtmosphere {
  color: string;
  shape: ParticleShape;
}

/** A single particle glyph. Shared by the discover page wash and popup fields. */
export function ParticleGlyph({
  shape,
  color,
  size,
}: {
  shape: ParticleShape;
  color: string;
  size: number;
}) {
  if (shape === 'heart') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 21s-7.4-4.6-9.9-9C.8 8.7 2.3 5.2 5.6 5.2c2 0 3.4 1.2 4 2.4.6-1.2 2-2.4 4-2.4 3.3 0 4.8 3.5 3.5 6.8-2.5 4.4-9.1 8.8-9.1 8.8z" />
      </svg>
    );
  }
  if (shape === 'star') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
        <path d="M12 2c.5 4.8 2.2 6.5 7 7-4.8.5-6.5 2.2-7 7-.5-4.8-2.2-6.5-7-7 4.8-.5 6.5-2.2 7-7z" />
      </svg>
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      }}
      className="block rounded-full"
    />
  );
}

interface ParticleSpec {
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  rot: number;
}

/**
 * A contained, ambient particle field for popups. Particles are scattered across
 * the box and gently bob + twinkle in place; the parent's `overflow-hidden` keeps
 * them inside. Absolutely positioned to fill its (positioned) parent, inert to
 * pointer events, and hidden entirely under `prefers-reduced-motion`.
 */
export function ParticleField({
  color,
  shape,
  count = 12,
  className,
}: PopupAtmosphere & { count?: number; className?: string }) {
  const particles = useMemo<ParticleSpec[]>(() => {
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: count }, () => {
      const duration = rnd(3.5, 7);
      return {
        left: rnd(3, 95),
        top: rnd(4, 92),
        size: rnd(8, 20),
        duration,
        delay: -rnd(0, duration), // negative → already mid-cycle on mount
        opacity: rnd(0.1, 0.28),
        rot: rnd(-16, 16),
      };
    });
    // Regenerate the field whenever the motif changes.
  }, [count, color, shape]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden',
        className,
      )}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="popup-particle absolute"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              filter: `drop-shadow(0 0 5px ${color})`,
              '--p-opacity': p.opacity,
              '--p-rot': `${p.rot}deg`,
            } as CSSProperties
          }
        >
          <ParticleGlyph shape={shape} color={color} size={p.size} />
        </span>
      ))}
    </div>
  );
}
