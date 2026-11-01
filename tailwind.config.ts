import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          50: '#f2f3f1', 100: '#e4e7e5', 200: '#ccd2d1', 300: '#a9b2b3', 400: '#808b8f',
          500: '#5f6b71', 600: '#48545a', 700: '#354047', 800: '#243037', 900: '#19242a', 950: '#111a1f',
        },
        // Цвет смолы и стекловолокна — фирменный акцент.
        accent: {
          50: '#fbf7e5', 100: '#f5ebbd', 200: '#ecdb8a', 300: '#e3c95b', 400: '#dcba3f',
          500: '#d4ab2a', 600: '#8f7012', 700: '#735a0f', 800: '#5a470f', 900: '#47390f',
        },
        fiber: { 300: '#f1d58a', 400: '#e6c065', 500: '#d4a63f', 600: '#b5862a' },
      },
      fontFamily: {
        sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'],
        display: ['"Unbounded Variable"', '"Manrope Variable"', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '1240px' },
      keyframes: {
        draw: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { draw: 'draw 1.4s cubic-bezier(.6,0,.2,1) both', rise: 'rise .7s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};

export default config;
