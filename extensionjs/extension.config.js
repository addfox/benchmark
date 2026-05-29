export default {
  browser: {
    edge: {
      profile: "default",
      preferences: { darkMode: false },
    },
  },
  commands: {
    dev: {
      browser: "edge",
      startingUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/color",
      polyfill: true,
      logLevel: "info",
      persistProfile: true,
    },
    start: {
      browser: "edge",
      startingUrl: "https://tailwindcss.com/docs/customizing-colors",
    },
    preview: {
      browser: "edge",
      startingUrl: "https://developer.mozilla.org/en-US/docs/Web/CSS/color",
    },
    build: {
      browser: "edge",
      zip: true,
      zipFilename: "benchmark-extension.zip",
    },
  },
};
