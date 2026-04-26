/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        success: "#16a34a",
        warning: "#ea8c55",
        danger: "#dc2626",
      },
      spacing: {
        120: "30rem",
      },
    },
  },
  plugins: [],
};