import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#f5f6f7', 100: '#eaecee', 200: '#d3d7db', 300: '#b0b6bd', 400: '#868e97',
          500: '#646c75', 600: '#4a5159', 700: '#353a40', 800: '#23272b', 900: '#181b1e', 950: '#0f1113',
        },
        accent: {
          50: '#fff4ed', 100: '#ffe4d3', 200: '#ffc6a5', 300: '#ff9f6c', 400: '#ff7a3a',
          500: '#ff5b14', 600: '#e84706', 700: '#bf3608', 800: '#982d0f', 900: '#7a2810',
        },
        fiber: { 300: '#f1d58a', 400: '#e6c065', 500: '#d4a63f', 600: '#b5862a' },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
        display: ['"Unbounded Variable"', '"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '1240px' },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise .7s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};

export default config;
