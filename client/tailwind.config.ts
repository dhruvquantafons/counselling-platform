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
      boxShadow: {
        soft: "0 2px 12px rgba(74, 99, 85, 0.06)",
        "soft-md": "0 4px 16px rgba(74, 99, 85, 0.08)",
        "soft-lg": "0 8px 24px rgba(74, 99, 85, 0.1)",
        warm: "0 4px 20px rgba(184, 128, 74, 0.1)",
      },
    },
  },
} satisfies Config;