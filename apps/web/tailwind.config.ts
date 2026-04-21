import type { Config } from 'tailwindcss';

// Craftly — Mobile-first, outdoor-optimized Tailwind config.
//
// Design constraints:
//   - High sunlight → high contrast (semantic tokens auto-invert in dark mode)
//   - Hands occupied → large touch targets (min 44px, WCAG 2.5.5)
//   - Quick glances → larger base font, clear hierarchy
//   - Modo Zen → clean, no visual noise

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary: warm amber — visible in sunlight, craft/artisan feel.
        craft: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Semantic tokens — driven by CSS variables in globals.css.
        // Auto-adapt between light and dark themes via html[data-theme='dark'].
        surface: {
          app: 'rgb(var(--surface-app) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          muted: 'rgb(var(--surface-muted) / <alpha-value>)',
          strong: 'rgb(var(--surface-strong) / <alpha-value>)',
        },
        fg: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        accent: {
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          'fg-strong': 'rgb(var(--accent-fg-strong) / <alpha-value>)',
        },
        success: {
          soft: 'rgb(var(--success-soft) / <alpha-value>)',
          strong: 'rgb(var(--success-strong) / <alpha-value>)',
          fg: 'rgb(var(--success-fg) / <alpha-value>)',
          'fg-strong': 'rgb(var(--success-fg-strong) / <alpha-value>)',
        },
        info: {
          soft: 'rgb(var(--info-soft) / <alpha-value>)',
          strong: 'rgb(var(--info-strong) / <alpha-value>)',
          fg: 'rgb(var(--info-fg) / <alpha-value>)',
          'fg-strong': 'rgb(var(--info-fg-strong) / <alpha-value>)',
        },
        danger: {
          soft: 'rgb(var(--danger-soft) / <alpha-value>)',
          strong: 'rgb(var(--danger-strong) / <alpha-value>)',
          fg: 'rgb(var(--danger-fg) / <alpha-value>)',
          'fg-strong': 'rgb(var(--danger-fg-strong) / <alpha-value>)',
        },
      },
      borderColor: {
        subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        soft: 'rgb(var(--border-soft) / <alpha-value>)',
        accent: 'rgb(var(--accent-border) / <alpha-value>)',
        success: 'rgb(var(--success-border) / <alpha-value>)',
        info: 'rgb(var(--info-border) / <alpha-value>)',
        danger: 'rgb(var(--danger-border) / <alpha-value>)',
      },
      fontSize: {
        // Bump base size for outdoor readability.
        base: ['1rem', { lineHeight: '1.625' }],
        lg: ['1.125rem', { lineHeight: '1.625' }],
      },
      spacing: {
        // Touch-safe spacing utilities.
        touch: '44px',
        'touch-lg': '56px',
      },
      minHeight: {
        touch: '44px',
        'touch-lg': '56px',
      },
      minWidth: {
        touch: '44px',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
