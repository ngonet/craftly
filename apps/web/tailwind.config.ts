import type { Config } from 'tailwindcss';

// Craftly — Mobile-first, outdoor-optimized Tailwind config.
//
// Design constraints:
//   - High sunlight → high contrast (stone-900 on stone-50)
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
