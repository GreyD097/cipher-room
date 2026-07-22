/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        ink: {
          950: '#0A0A0B',
          900: '#101012',
          800: '#16161A',
          700: '#1E1E24',
          600: '#2A2A32',
          500: '#3A3A44',
        },
        bone: {
          100: '#F5F5F2',
          200: '#EDEDED',
          300: '#C7C7C2',
          400: '#8C8C88',
        },
        signal: {
          green: '#7CFFB2',
          red: '#FF5C5C',
          amber: '#FFC65C',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
}
