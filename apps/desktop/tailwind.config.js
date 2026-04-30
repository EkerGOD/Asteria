import typography from "@tailwindcss/typography";

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
        surface: "rgb(var(--asteria-surface) / <alpha-value>)",
        ink: "rgb(var(--asteria-ink) / <alpha-value>)",
        pine: "rgb(var(--asteria-pine) / <alpha-value>)",
        clay: "rgb(var(--asteria-clay) / <alpha-value>)",
        denim: "rgb(var(--asteria-denim) / <alpha-value>)"
      }
    }
  },
  plugins: [typography]
};
