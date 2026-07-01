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
        cinzel: ['Cinzel', 'serif'],
        sans: ['"PT Sans"', 'Inter', 'sans-serif'],
        dash: ['"PT Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
