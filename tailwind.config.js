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
          950: 'rgb(var(--ink-950) / <alpha-value>)',
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
          500: 'rgb(var(--ink-500) / <alpha-value>)',
        },
        bone: {
          100: 'rgb(var(--bone-100) / <alpha-value>)',
          200: 'rgb(var(--bone-200) / <alpha-value>)',
          300: 'rgb(var(--bone-300) / <alpha-value>)',
          400: 'rgb(var(--bone-400) / <alpha-value>)',
          500: 'rgb(var(--bone-500) / <alpha-value>)',
        },
        signal: {
          green: 'rgb(var(--signal-green) / <alpha-value>)',
          red: 'rgb(var(--signal-red) / <alpha-value>)',
          amber: 'rgb(var(--signal-amber) / <alpha-value>)',
        },
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
    },
  },
  plugins: [],
}
