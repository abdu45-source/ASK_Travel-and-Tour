/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fbf7ee',
          100: '#f5ebd2',
          200: '#edd8a6',
          300: '#e1be72',
          400: '#d7a448',
          500: '#c58728', // Warm Ethiopian amber/ochre
          600: '#ac691f',
          700: '#8c4e1c',
          800: '#733f1c',
          900: '#61361c',
        },
        safari: {
          50: '#f3f7f4',
          100: '#e3ece6',
          200: '#c8dacd',
          300: '#a1c0aa',
          400: '#75a082',
          500: '#4f815e', // Lush highland green
          600: '#3c674a',
          700: '#31523c',
          800: '#294232',
          900: '#23372b',
        },
        earth: {
          50: '#faf6f3',
          100: '#f3ece5',
          200: '#e6d8cb',
          300: '#d4bea9',
          400: '#be9e84',
          500: '#a78266', // Lalibela volcanic stone terracotta
          600: '#946f56',
          700: '#7b5946',
          800: '#654a3c',
          900: '#543f34',
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
