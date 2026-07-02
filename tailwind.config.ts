import type { Config } from 'tailwindcss';

/**
 * Central design system. All colors, radii, shadows and animations live here as
 * tokens so components never hard-code hex values (a key problem of the old app).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f18',
        card: '#16192b',
        'card-2': '#111320',
        accent: {
          purple: '#8a2be2',
          neon: '#00f5d4',
        },
        green: '#2ecc71',
        blue: '#3a86ff',
        orange: '#ff0055',
        danger: '#ff4757',
        ink: '#f1f3f9',
        muted: '#7e8da6',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '20px',
        xl3: '24px',
      },
      boxShadow: {
        card: '0 8px 20px rgba(0,0,0,0.2)',
        'glow-purple': '0 0 20px rgba(138,43,226,0.5)',
        'glow-neon': '0 0 20px rgba(0,245,212,0.4)',
        'glow-orange': '0 0 25px rgba(255,0,85,0.6)',
        modal: '0 20px 40px rgba(0,0,0,0.6)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        staggerFadeIn: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        winnerPop: {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        skelLoad: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        iconBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translate(-50%, -20px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        // Smooth ease-out-expo everywhere. Any visual "pop" (overshoot) is encoded
        // in the keyframe scale values, not in tacky elastic/bounce timing curves.
        stagger: 'staggerFadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'winner-pop': 'winnerPop 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        skeleton: 'skelLoad 1.5s infinite',
        'icon-bounce': 'iconBounce 0.4s cubic-bezier(0.16,1,0.3,1)',
        'toast-in': 'toastIn 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
