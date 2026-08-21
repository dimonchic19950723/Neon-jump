import type { CapacitorConfig } from "@capacitor/cli";

const DEFAULT_SERVER_URL = "https://neon-jump-aewz.vercel.app";

const rawServerUrl = (
  process.env.CAPACITOR_SERVER_URL || DEFAULT_SERVER_URL
).trim().replace(/\/$/, "");

const parsed = new URL(rawServerUrl);

const config: CapacitorConfig = {
  appId: "com.neonjump.game",
  appName: "NEON JUMP",
  webDir: "www",
  backgroundColor: "#0b0620",
  server: {
    url: rawServerUrl,
    cleartext: false,
    allowNavigation: [parsed.hostname, "*.vercel.app"],
  },
  android: {
    backgroundColor: "#0b0620",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      launchAutoHide: true,
      backgroundColor: "#0b0620",
      showSpinner: true,
      spinnerColor: "#d946ef",
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#0b0620",
    },
  },
};

export default config;
