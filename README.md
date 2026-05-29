# Extension Build Benchmark

This repository benchmarks four browser extension frameworks by building the **same extension** with identical functionality. The goal is to compare **dev startup time**, **build time**, and **output size**.

Reference: [rstackjs/build-tools-performance](https://github.com/rstackjs/build-tools-performance)

## Frameworks

| Directory | Framework | Version | Bundler | Description |
|-----------|-----------|---------|---------|-------------|
| `addfox/` | Addfox | 0.2.0 | Rsbuild 2.0.7 | Rsbuild-based framework (`addfox.config.ts`, `defineConfig` + `pluginReact`) |
| `wxt/` | WXT | 0.20.26 | Vite 8.0.14 | WXT framework |
| `plasmo/` | Plasmo | 0.90.5 | Parcel 2.9.3 | Plasmo framework |
| `extensionjs/` | Extension.js | 3.17.0 | Rspack 2.0.x | Extension.js framework |

## Benchmark Results

### Environment

- **OS**: Windows
- **Browser**: Microsoft Edge
- **Node.js**: 24.16.0
- **Package Manager**: pnpm 10.0.0
- **Test Method**: 8 runs per framework, averaged (warm-up run before each suite to eliminate cold-start bias)
- **Last Updated**: 2026-05-29

### Dev Startup Time

Time from running `dev` command to dev server ready (including browser launch and extension installation where applicable):

> **Note:** All frameworks automatically open the browser and install the extension during dev. Each framework was tested with 8 runs after a warm-up run to eliminate cold-start bias.

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Extension.js** | 2.13s | 2.08s | 2.20s | 2.12, 2.08, 2.17, 2.20, 2.08, 2.10, 2.10, 2.19 |
| **WXT** | 2.13s | 2.09s | 2.19s | 2.14, 2.11, 2.09, 2.12, 2.12, 2.19, 2.15, 2.12 |
| **Addfox** | 2.39s | 2.32s | 2.52s | 2.48, 2.42, 2.52, 2.34, 2.33, 2.32, 2.34, 2.35 |
| **Plasmo** | 3.04s | 3.02s | 3.08s | 3.08, 3.04, 3.03, 3.03, 3.04, 3.04, 3.05, 3.02 |

### Build Time

Time to complete production build (total time from running the command to build complete, including CLI startup overhead):

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Addfox** | 1.47s | 1.43s | 1.55s | 1.55, 1.54, 1.45, 1.46, 1.43, 1.45, 1.46, 1.44 |
| **Extension.js** | 1.53s | 1.51s | 1.55s | 1.54, 1.51, 1.52, 1.53, 1.52, 1.54, 1.55, 1.52 |
| **WXT** | 1.83s | 1.82s | 1.85s | 1.85, 1.82, 1.84, 1.83, 1.85, 1.82, 1.83, 1.82 |
| **Plasmo** | 2.63s | 2.58s | 2.68s | 2.68, 2.60, 2.63, 2.58, 2.68, 2.59, 2.67, 2.64 |

### Build Output Size

Production build output (excluding source maps):

| Framework | Size | Target |
|-----------|------|--------|
| **WXT** | 812 KB | `chrome-mv3` |
| **Addfox** | 837 KB | `extension-chromium` |
| **Plasmo** | 1.36 MB | `chrome-mv3-prod` |
| **Extension.js** | 1.45 MB | `chromium` (no source maps; `chrome`/`edge` builds are ~20 MB each with source maps) |

> **Measurement method:** Output directory is cleaned before each build. Size is the exact sum of all file bytes in the production output directory (source maps excluded).

## Summary

| Framework | Version | Dev Startup | Build Time | Output Size |
|-----------|---------|-------------|------------|-------------|
| **Extension.js** | 3.17.0 | 🥇 2.13s | 🥈 1.53s | 🥉 1.45 MB |
| **WXT** | 0.20.26 | 🥇 2.13s | 🥉 1.83s | 🥇 812 KB |
| **Addfox** | 0.2.0 | 🥉 2.39s | 🥇 1.47s | 🥈 837 KB |
| **Plasmo** | 0.90.5 | 4th 3.04s | 4th 2.63s | 4th 1.36 MB |

## Unified Tech Stack

- **Framework**: React + Tailwind CSS 3
- **Dependencies**: lodash, react, react-dom, webextension-polyfill
- **Entry Points**: background, content, options, popup, sidepanel, devtools, space (custom)
- **Features**:
  - Popup: Capture screenshot of current page
  - Sidepanel: Fake AI chat (fixed responses)
  - DevTools: Display captured element colors
  - Space: Display captured screenshots (temporary storage)
  - Options: Common settings UI (language, limits, permissions)
- **Resources**: Icons from VideoRoll-Pro, i18n via `_locales` (en / zh_CN)

## Usage

### 1. Install Dependencies

```bash
pnpm install --no-frozen-lockfile
```

### 2. Copy Icons

Requires VideoRoll-Pro repository:

```bash
pnpm run copy-icons
```

### 3. Run Individual Tests

**Dev startup time:**

```bash
pnpm run test:addfox
pnpm run test:wxt
pnpm run test:plasmo
pnpm run test:extensionjs
```

**Build time:**

```bash
pnpm run build:addfox
pnpm run build:wxt
pnpm run build:plasmo
pnpm run build:extensionjs
```

### 4. Batch Benchmark (8 runs with average)

```bash
# Dev benchmark
node scripts/run-benchmark-suite.mjs dev

# Build benchmark
node scripts/run-benchmark-suite.mjs build
```

## Directory Structure

```
benchmark/
├── package.json               # Root scripts: copy-icons, test:*, build:*
├── pnpm-workspace.yaml        # Workspaces: addfox, wxt, plasmo, extensionjs
├── scripts/
│   ├── dev-benchmark.mjs      # Dev startup time benchmark
│   ├── build-benchmark.mjs    # Build time benchmark
│   ├── run-benchmark-suite.mjs # 5-run benchmark suite with averages
│   ├── batch-benchmark.mjs    # Batch test all frameworks
│   └── copy-icons.mjs         # Copy icons from VideoRoll-Pro
├── shared/
│   ├── icons/                 # Shared icons
│   └── locales/               # i18n reference
├── addfox/                    # Addfox implementation
├── wxt/                       # WXT implementation
├── plasmo/                    # Plasmo implementation
└── extensionjs/               # Extension.js implementation
```

## Implementation Status

- ✅ **Addfox**: Fully implemented with all features
- ✅ **WXT**: Fully implemented with all features
- ✅ **Extension.js**: Fully implemented with all features
- ✅ **Plasmo**: Fully implemented with all features
