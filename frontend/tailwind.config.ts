import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#d9dee7',
        surface: '#f6f8fb',
        ink: '#17202f',
        muted: '#697386',
        primary: {
          50: '#eef8ff',
          100: '#d9efff',
          500: '#1677c7',
          600: '#0f66ad',
          700: '#0b528e',
        },
        success: '#198754',
        warning: '#b7791f',
        danger: '#c2413b',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(18, 25, 38, 0.08)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
