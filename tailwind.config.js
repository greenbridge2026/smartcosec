/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./signin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
