import { defineConfig } from "addfox";
import { pluginReact } from "@rsbuild/plugin-react";

const manifest = {
  name: "Benchmark Extension",
  version: "0.0.1",
  manifest_version: 3,
  description: "Popup screenshot + AI sidebar + devtools colors (benchmark)",
  permissions: ["storage", "activeTab", "tabs", "sidePanel", "scripting"],
  action: { default_popup: "popup/index.tsx", default_title: "Screenshot" },
  options_ui: { page: "options/index.tsx", open_in_tab: true },
  background: { service_worker: "background/index.ts" },
  content_scripts: [
    { matches: ["<all_urls>"], js: ["content/index.ts"], run_at: "document_idle" },
  ],
  devtools_page: "devtools/index.tsx",
  side_panel: { default_path: "sidepanel/index.tsx" },
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
