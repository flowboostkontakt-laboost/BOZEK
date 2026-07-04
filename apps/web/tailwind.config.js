/** Motyw odczytany z mockupów: ciemne tło, fioletowe akcenty, zieleń dla premii. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0b10",
        surface: {
          DEFAULT: "#16141d",
          1: "#16141d",
          2: "#1e1b29",
          3: "#272235",
        },
        line: "#2a2637",
        accent: {
          DEFAULT: "#7c5cff",
          600: "#6a48e6",
          500: "#7c5cff",
          400: "#9276ff",
          300: "#a78bff",
          soft: "rgba(124,92,255,0.14)",
        },
        ink: {
          DEFAULT: "#f2f0f7",
          muted: "#a39fb3",
          faint: "#6f6b7e",
        },
        ok: "#34d399",
        warn: "#fbbf24",
        bad: "#fb7185",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(124,92,255,0.35), 0 8px 30px -8px rgba(124,92,255,0.45)",
      },
    },
  },
  plugins: [],
};
