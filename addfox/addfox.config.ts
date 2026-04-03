import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  permissions: ["storage", "activeTab", "tabs", "sidePanel", "scripting"],
  content_scripts: [
    { matches: ["<all_urls>"], js: ["content/index.ts"], run_at: "document_idle" },
  ],
  default_locale: "en",
  icons: {
    16: "/icons/icon_16.png",
    32: "/icons/icon_32.png",
    48: "/icons/icon_48.png",
    64: "/icons/icon_64.png",
    128: "/icons/icon_128.png",
    256: "/icons/icon_256.png",
    512: "/icons/icon_512.png",
  },
};

const firefoxManifest = {
  ...manifest,
  browser_specific_settings: { gecko: { id: "benchmark-addfox@example.com" } },
};

export default defineConfig({
  manifest: { chromium: manifest, firefox: firefoxManifest },
  plugins: [pluginReact()],
  entry: {
    space: "space/index.tsx",
  },
  rsbuild: {
    server: {
      port: 4299
    }
  },
  hotReload: { autoRefreshContentPage: true },
});
