/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffbea',
          100: '#fff3c6',
          200: '#ffe58c',
          300: '#ffd047',
          400: '#ffb91b',
          500: '#ffc500', // active keyword yellow-gold
          600: '#cc8600',
          700: '#995900',
          800: '#804804',
          900: '#663907',
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
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
