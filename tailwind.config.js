/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./*.html",
    "./admin/*.html",
    "./client/*.html",
    "./staff/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.js",
    "./admin/*.js",
    "./client/*.js",
    "./staff/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: '#298486',
        secondary: '#36A9AD',
        accent: '#F15A24',
      }
    },
  },
  plugins: [],
}
