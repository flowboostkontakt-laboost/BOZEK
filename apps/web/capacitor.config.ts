import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "eu.mrtiq.ewidencja",
  appName: "Ewidencja",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
