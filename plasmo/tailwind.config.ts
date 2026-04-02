import type { Config } from "tailwindcss";

export default {
  content: [
    "./popup.tsx",
    "./options.tsx",
    "./sidepanel.tsx",
    "./devtools.tsx",
    "./contents/*.tsx",
    "./tabs/*.tsx",
    "./source/**/*.tsx",
  ],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
