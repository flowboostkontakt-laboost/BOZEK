import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "eu.mrtiq.ewidencja",
  appName: "Ewidencja",
  webDir: "dist",
  server: {
    // Apka ładuje treść wprost z serwera → każda aktualizacja pojawia się
    // automatycznie po otwarciu, bez instalowania nowego APK.
    url: "https://bozek-web.onrender.com",
    androidScheme: "https",
  },
};

export default config;
