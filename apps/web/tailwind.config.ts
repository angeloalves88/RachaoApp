import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1200px',
      },
    },
    extend: {
      colors: {
        // Surfaces
        background: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          2: 'var(--color-surface-2)',
          offset: 'var(--color-surface-offset)',
        },
        divider: 'var(--color-divider)',
        border: 'var(--color-border)',

        // Texto
        foreground: 'var(--color-text)',
        muted: {
          DEFAULT: 'var(--color-text-muted)',
          foreground: 'var(--color-text-muted)',
        },
        faint: 'var(--color-text-faint)',

        // Acento - Laranja Fogo
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          highlight: 'var(--color-primary-highlight)',
          foreground: 'var(--color-text-inverse)',
        },

        // Status
        success: {
          DEFAULT: 'var(--color-success)',
          highlight: 'var(--color-success-highlight)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          highlight: 'var(--color-warning-highlight)',
        },
        destructive: {
          DEFAULT: 'var(--color-error)',
          highlight: 'var(--color-error-highlight)',
          foreground: 'var(--color-text)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          highlight: 'var(--color-info-highlight)',
        },

        // shadcn aliases (compat)
        input: 'var(--color-border)',
        ring: 'var(--color-primary)',
        accent: {
          DEFAULT: 'var(--color-surface-offset)',
          foreground: 'var(--color-text)',
        },
        card: {
          DEFAULT: 'var(--color-surface)',
          foreground: 'var(--color-text)',
        },
        popover: {
          DEFAULT: 'var(--color-surface-2)',
          foreground: 'var(--color-text)',
        },
        secondary: {
          DEFAULT: 'var(--color-surface-offset)',
          foreground: 'var(--color-text)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: 'var(--text-xs)',
        sm: 'var(--text-sm)',
        base: 'var(--text-base)',
        lg: 'var(--text-lg)',
        xl: 'var(--text-xl)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionTimingFunction: {
        interactive: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-warning': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-warning': 'pulse-warning 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
