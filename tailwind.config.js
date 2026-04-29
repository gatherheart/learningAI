/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rust: {
          50: "#fdf6f3",
          100: "#fbe7df",
          200: "#f6c8b3",
          400: "#e07a5f",
          500: "#ce5c3d",
          600: "#b04323",
          700: "#8a341c",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
