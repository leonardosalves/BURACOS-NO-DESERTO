/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dash: {
          bg: '#02030a',
          card: '#0c1018',
          'card-hover': '#121a26',
          border: '#1a2230',
          'border-soft': '#141a24',
          primary: '#8280fd',
          'primary-dark': '#6045e2',
          'primary-light': '#d8d6fe',
          success: '#5bc486',
          info: '#08b8c4',
          warning: '#e8a84a',
          danger: '#e86578',
          muted: '#8b95a8',
        },
        zinc: {
          850: '#222226',
        },
        gray: {
          850: '#222226',
        },
        gold: {
          50: '#e9e7ff',
          100: '#d4d1fe',
          200: '#b8b5fd',
          300: '#a3a0fc',
          400: '#9290fd',
          500: '#8280fd',
          600: '#6045e2',
          700: '#4f3bc0',
          800: '#3e2f9e',
          900: '#2d237c',
          950: '#1a1548',
        },
        amber: {
          50: 'rgba(232, 168, 74, 0.08)',
          100: 'rgba(232, 168, 74, 0.14)',
          200: 'rgba(232, 168, 74, 0.22)',
          300: '#c4923f',
          400: '#d9a44a',
          500: '#e8a84a',
          600: '#c48a35',
          700: '#9a6b28',
          800: '#6f4d1c',
          900: '#453010',
          950: '#2a1d0a',
        },
        water: {
          50: '#f0faff',
          100: '#e0f4ff',
          200: '#bce8xff',
          300: '#80e0ff', // active word water blue
          400: '#38c5ff',
          500: '#00a3ff',
          600: '#007acc',
          700: '#005a99',
          800: '#004880',
          900: '#003966',
        }
      },
      fontFamily: {
        cinzel: ['"PT Sans"', 'Inter', 'sans-serif'],
        sans: ['"PT Sans"', 'Inter', 'sans-serif'],
        dash: ['"PT Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
