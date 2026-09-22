import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        panel: "var(--panel)",
        well: "var(--well)",
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          wash: "var(--accent-wash)",
        },
        seal: {
          DEFAULT: "var(--seal)",
          wash: "var(--seal-wash)",
        },
        alert: {
          DEFAULT: "var(--alert)",
          wash: "var(--alert-wash)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          wash: "var(--warn-wash)",
        },
        hold: {
          DEFAULT: "var(--hold)",
          wash: "var(--hold-wash)",
        },
        ok: {
          DEFAULT: "var(--ok)",
          wash: "var(--ok-wash)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        data: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderWidth: {
        0.5: "0.5px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "rotate(-6deg) scale(1.4)" },
          "60%": { opacity: "1", transform: "rotate(-6deg) scale(0.96)" },
          "100%": { opacity: "1", transform: "rotate(-6deg) scale(1)" },
        },
        "ink-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "spring-pop": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.9)" },
          "60%": { opacity: "1", transform: "translateY(-2px) scale(1.02)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pulse-dot": {
          "0%": { transform: "rotate(45deg) scale(1)", opacity: "1" },
          "50%": { transform: "rotate(45deg) scale(1.55)", opacity: "0.65" },
          "100%": { transform: "rotate(45deg) scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.22s ease-out both",
        "stamp-in": "stamp-in 0.3s ease-out both",
        "ink-in": "ink-in 0.3s ease-out both",
        "spring-pop": "spring-pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
