import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f7f2",
          100: "#dfeadf",
          200: "#c7d9c8",
          600: "#3e7355",
          700: "#27553f",
          800: "#183e31",
          900: "#0c2b22"
        },
        sun: "#f59e42",
        skysoft: "#d9edf7",
        cream: "#f8f4ec"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 45px rgba(12, 43, 34, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
