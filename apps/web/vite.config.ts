import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "favicon.png"],
      manifest: {
        name: "Ewidencja Produkcji — Micro-Workshop",
        short_name: "Ewidencja",
        description: "Ewidencja produkcji i norm pracy — aplikacja pracownicy",
        lang: "pl",
        theme_color: "#0c0b10",
        background_color: "#0c0b10",
        display: "standalone",
        orientation: "portrait",
        start_url: "/app",
        scope: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true, // nasłuch na 0.0.0.0 — dostęp z telefonu w tej samej sieci Wi-Fi
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": { target: "http://localhost:3000", changeOrigin: true },
    },
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
  },
});
