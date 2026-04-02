import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: ".",
  entrypointsDir: "entrypoints",
  manifest: {
    name: "Benchmark Extension",
    version: "0.0.1",
    description: "Popup screenshot + AI sidebar + devtools colors (benchmark)",
    permissions: ["storage", "activeTab", "tabs", "sidePanel", "scripting"],
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
  },
});
