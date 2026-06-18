import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8A0112',   // brand crimson — logo background
          light: '#B5021A',     // hover
          dark: '#5E000C',      // pressed
          accent: '#FDEEF0',    // soft tint
        },
        // Gold — drum and Marathi subtitle colour from logo
        gold: {
          DEFAULT: '#F5C400',
          light:   '#FFD740',
          dark:    '#C49A00',
          accent:  '#FFF8D6',
        },
        success: { DEFAULT: '#3B6D11', bg: '#EAF3DE' },
        danger:  { DEFAULT: '#A32D2D', bg: '#FCEBEB' },
        warning: { DEFAULT: '#854F0B', bg: '#FAEEDA' },
        info:    { DEFAULT: '#185FA5', bg: '#E6F1FB' },
        ink: { DEFAULT: '#1A1A2E', secondary: '#666666' },
        border: '#E0DFD8',
        background: '#FAFAF7',
        surface: '#FFFFFF',
        // Sidebar — logo dark-red/near-black background
        'sidebar-bg':     '#1A0005',
        'sidebar-border': '#3D0010',
        instrument: {
          dhol:  '#8A0112',
          tasha: '#1D9E75',
          tool:  '#BA7517',
          dhwaj: '#185FA5',
        },
      },
      fontFamily: {
        sans:       ['var(--font-inter)', 'sans-serif'],
        devanagari: ['var(--font-noto-devanagari)', 'sans-serif'],
        mono:       ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '8px', md: '12px', lg: '16px', xl: '20px',
      },
      boxShadow: {
        card:    '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'gold':  '0 0 0 2px #F5C400',
      },
      keyframes: {
        'scan-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'gold-shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
      animation: {
        'scan-pulse':   'scan-pulse 2s ease-in-out infinite',
        'gold-shimmer': 'gold-shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
