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
          200: "#b0ebd9",
          300: "#7fe0c3",
          400: "#41cca6",
          500: "#13a886",
          600: "#0b8b70",
          700: "#08715c",
          800: "#0e5446",
          900: "#123d35",
          950: "#09241f",
        },
        brand: {
          primary: "#0b8b70",
          "primary-hover": "#08715c",
          dark: "#123d35",
          darker: "#09241f",
          surface: "#ffffff",
          bg: "#f8fbfa",
          muted: "#64748b",
          border: "#e2e8f0",
          light: "#eefbf7",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(18, 61, 53, 0.05), 0 1px 2px -1px rgba(18, 61, 53, 0.05)",
        "card-hover": "0 10px 15px -3px rgba(18, 61, 53, 0.08), 0 4px 6px -4px rgba(18, 61, 53, 0.04)",
        modal: "0 20px 25px -5px rgba(18, 61, 53, 0.15), 0 8px 10px -6px rgba(18, 61, 53, 0.1)",
      },
      borderRadius: {
        clinical: "0.875rem",
      },
    },
  },
  plugins: [],
};