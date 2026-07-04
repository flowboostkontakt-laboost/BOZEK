/** Motyw odczytany z mockupów: ciemne tło, fioletowe akcenty, zieleń dla premii. */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090a",
        surface: {
          DEFAULT: "#151315",
          1: "#151315",
          2: "#1e1a1c",
          3: "#2a2325",
        },
        line: "#2c2528",
        accent: {
          DEFAULT: "#a8264a",
          600: "#8c1c33",
          500: "#a8264a",
          400: "#c33a5e",
          300: "#e07089",
          soft: "rgba(168,38,74,0.16)",
        },
        ink: {
          DEFAULT: "#f4f0f1",
          muted: "#b0a6a9",
          faint: "#79706f",
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
        glow: "0 0 0 1px rgba(168,38,74,0.35), 0 8px 30px -8px rgba(168,38,74,0.45)",
      },
    },
  },
  plugins: [],
};
