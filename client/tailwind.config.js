/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tooth: {
          50: "#eefbf7",
          100: "#d5f5eb",
          500: "#13a886",
          600: "#0b8b70",
          700: "#08715c",
          900: "#123d35",
        },
      },
    },
  },
  plugins: [],
};