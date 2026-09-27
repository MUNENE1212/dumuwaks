/** @type {import('tailwindcss').Config} */

/*
 * Dumuwaks — Tailwind theme.
 * Values mirror src/styles/tokens.css (hex here so opacity modifiers like
 * `bg-lumen/10` work). Change a value in both places.
 *
 * Semantic names are the API: surface-*, line, ink*, lumen*, circuit, ok, warn, fault.
 * Legacy palette names (primary, circuit-500, gray, green…) are re-pointed to
 * those roles so older components render in the new system; new code should
 * not use them. See docs/design/DESIGN_SYSTEM.md.
 */

const surface = {
  '000': '#0b0907',
  100: '#14110c',
  200: '#1d1811',
  300: '#262017',
  400: '#2f271c',
};

const ink = { DEFAULT: '#f5eee1', muted: '#b8ab95', faint: '#8a7f6d' };

// Warm neutral ramp, lightest → darkest. Used by legacy gray/neutral/slate classes.
const neutral = {
  50: '#f5eee1',
  100: '#e8dfcf',
  200: '#d3c7b2',
  300: '#b8ab95',
  400: '#8a7f6d',
  500: '#6b6152',
  600: '#453a29',
  700: '#332b1f',
  800: '#1d1811',
  900: '#14110c',
  950: '#0b0907',
};

// Amber ramp: 500/600 = lumen (the action colour).
const amber = {
  50: '#2a2010',
  100: '#3a2b12',
  200: '#5a4115',
  300: '#f6c45c',
  400: '#f6c45c',
  500: '#e8a317',
  600: '#e8a317',
  700: '#f0b43a',
  800: '#b4740f',
  900: '#2a2010',
  950: '#1a1203',
  DEFAULT: '#e8a317',
};

const status = (hex, ink, tintDark, tintMid) => ({
  50: tintDark,
  100: tintDark,
  200: tintMid,
  300: ink,
  400: ink,
  500: hex,
  600: hex,
  700: ink,
  800: ink,
  900: tintDark,
  950: tintDark,
  DEFAULT: hex,
});

const circuit = status('#1fa3d6', '#6cc4ea', '#0f2029', '#15384a');
const ok = status('#5cb860', '#8fd592', '#132214', '#1e3a20');
const warn = status('#d9a040', '#e8bd70', '#261d0d', '#3d2e12');
const fault = status('#e0705c', '#f0a092', '#2a1410', '#46201a');

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Semantic (use these) ----
        surface,
        line: { DEFAULT: '#332b1f', strong: '#453a29' },
        ink,
        lumen: {
          DEFAULT: '#e8a317',
          hover: '#f0b43a',
          ink: '#f6c45c',
          tint: 'rgba(232, 163, 23, 0.12)',
        },
        filament: '#ffc94a',
        ember: '#b4740f',
        core: '#fff6e2',
        'on-lumen': '#14110c',
        circuit: { ...circuit, ink: '#6cc4ea' },
        ok: { ...ok, ink: '#8fd592' },
        warn: { ...warn, ink: '#e8bd70' },
        fault: { ...fault, ink: '#f0a092' },
        mahogany: {
          DEFAULT: '#261212',
          50: '#261212',
          100: '#261212',
          500: '#261212',
          600: surface[200],
          700: surface[100],
          800: surface['000'],
          900: surface['000'],
        },
        whatsapp: { DEFAULT: '#25d366', dark: '#128c7e' },

        // ---- Legacy names, re-pointed ----
        primary: amber,
        brand: { DEFAULT: '#e8a317', hover: '#f0b43a', light: '#ffc94a' },
        orange: amber,
        amber: warn,
        yellow: warn,
        blue: circuit,
        sky: circuit,
        cyan: circuit,
        indigo: circuit,
        purple: circuit,
        violet: circuit,
        wrench: circuit,
        secondary: circuit,
        green: ok,
        emerald: ok,
        teal: ok,
        lime: ok,
        success: ok,
        red: fault,
        rose: fault,
        pink: fault,
        error: fault,
        warning: warn,
        info: circuit,
        gray: neutral,
        neutral,
        slate: neutral,
        zinc: neutral,
        stone: neutral,
        charcoal: {
          ...neutral,
          DEFAULT: surface[200],
          500: surface[200],
          600: surface[100],
          700: surface['000'],
          800: surface['000'],
          900: surface['000'],
        },
        bone: { ...neutral, DEFAULT: ink.DEFAULT, 200: ink.DEFAULT },
        steel: { ...neutral, DEFAULT: ink.muted, 500: ink.muted, 600: ink.faint },
        background: {
          DEFAULT: surface[100],
          primary: surface[100],
          secondary: surface[200],
          tertiary: surface[300],
          elevated: surface[400],
        },
        text: {
          DEFAULT: ink.DEFAULT,
          primary: ink.DEFAULT,
          secondary: ink.muted,
          tertiary: ink.faint,
          muted: ink.faint,
        },
        border: {
          DEFAULT: '#332b1f',
          subtle: '#332b1f',
          medium: '#453a29',
          strong: '#453a29',
        },
        'mahogany-light': surface[300],
        'dw-black': surface[100],
        'dw-dark': surface[200],
        'dw-medium': surface[400],
        'dw-light': ink.muted,
        'dw-white': ink.DEFAULT,
      },

      fontFamily: {
        display: ['Archivo', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Emen scale
        hero: ['64px', { lineHeight: '60px', letterSpacing: '-0.025em', fontWeight: '800' }],
        display: ['44px', { lineHeight: '46px', letterSpacing: '-0.02em', fontWeight: '800' }],
        title: ['30px', { lineHeight: '34px', letterSpacing: '-0.015em', fontWeight: '700' }],
        heading: ['20px', { lineHeight: '26px', fontWeight: '700' }],
        lead: ['17px', { lineHeight: '27px' }],
        body: ['15px', { lineHeight: '24px' }],
        'body-sm': ['13.5px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '17px' }],
        spec: ['13.5px', { lineHeight: '21px' }],
        label: ['11px', { lineHeight: '14px', letterSpacing: '0.1em', fontWeight: '500' }],
        // Legacy names
        'display-xl': ['64px', { lineHeight: '60px', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-lg': ['44px', { lineHeight: '46px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-md': ['30px', { lineHeight: '34px', letterSpacing: '-0.015em', fontWeight: '700' }],
        'heading-xl': ['24px', { lineHeight: '30px', fontWeight: '700' }],
        'heading-lg': ['20px', { lineHeight: '26px', fontWeight: '700' }],
        'heading-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'heading-sm': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '27px' }],
        'body-md': ['15px', { lineHeight: '24px' }],
        meta: ['13px', { lineHeight: '18px', fontWeight: '500' }],
        tiny: ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },

      spacing: {
        18: '4.5rem',
        72: '18rem',
        84: '21rem',
        96: '24rem',
      },

      minHeight: { touch: '44px', 'touch-lg': '48px' },
      minWidth: { touch: '44px', 'touch-lg': '48px' },

      // Square-cut: nothing rounder than 8px except status pills.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '4px',
        xl: '8px',
        '2xl': '8px',
        '3xl': '8px',
        '4xl': '8px',
        full: '9999px',
      },

      // No blur in this system: surfaces are opaque.
      backdropBlur: { xs: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0' },

      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.6)',
        DEFAULT: '0 1px 2px rgba(0,0,0,0.6)',
        md: '0 1px 2px rgba(0,0,0,0.6)',
        lg: '0 12px 32px -18px rgba(0,0,0,0.9)',
        xl: '0 12px 32px -18px rgba(0,0,0,0.9)',
        '2xl': '0 12px 32px -18px rgba(0,0,0,0.9)',
        raised: '0 1px 2px rgba(0,0,0,0.6)',
        float: '0 12px 32px -18px rgba(0,0,0,0.9)',
        glass: '0 1px 2px rgba(0,0,0,0.6)',
        'glass-lg': '0 12px 32px -18px rgba(0,0,0,0.9)',
        led: 'none',
        'led-lg': 'none',
        'led-purple': 'none',
        brand: 'none',
        'brand-lg': 'none',
        mahogany: '0 1px 2px rgba(0,0,0,0.6)',
        'mahogany-lg': '0 12px 32px -18px rgba(0,0,0,0.9)',
      },

      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'scale-in': 'scaleIn 150ms ease-out',
        'pulse-glow': 'none',
        'led-flicker': 'none',
      },

      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },

      // Gradients are retired; legacy names resolve to flat grounds.
      backgroundImage: {
        'hero-gradient': 'none',
        'mahogany-gradient': 'none',
        'circuit-gradient': 'none',
      },

      transitionTimingFunction: {
        'ease-out-back': 'cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};
