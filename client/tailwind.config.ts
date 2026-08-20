import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0",
        ink: "#232C26",
        sage: { DEFAULT: "#4A6355", light: "#E3E9E1", dark: "#2F4438" },
        amber: { DEFAULT: "#B8804A", light: "#F0E2D2" },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
} satisfies Config;