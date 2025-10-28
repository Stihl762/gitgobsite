/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        body: "#171710",
        header: "#1F3B1D",
        amber: "#FFBF00",
        ivory: "#FFFFF0",
      },
      fontFamily: {
        sans: ["'DM Sans'", "'Inter'", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};