/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      colors: {
        surface: "#f7f5ef",
        ink: "#1f2933",
        pine: "#1f6f55",
        clay: "#b35c38",
        denim: "#315c8c"
      }
    }
  },
  plugins: []
};
