# Extension Build Benchmark

This repository benchmarks four browser extension frameworks by building the **same extension** with identical functionality. The goal is to compare **dev startup time**, **build time**, and **output size**.

Reference: [rstackjs/build-tools-performance](https://github.com/rstackjs/build-tools-performance)

## Frameworks

| Directory | Framework | Description |
|-----------|-----------|-------------|
| `addfox/` | Addfox | Rsbuild-based framework (`addfox.config.ts`, `defineConfig` + `pluginReact`) |
| `wxt/` | WXT | WXT framework |
| `plasmo/` | Plasmo | Plasmo framework |
| `extensionjs/` | Extension.js | Extension.js framework |

## Benchmark Results

### Environment

- **OS**: Windows
- **Browser**: Microsoft Edge
- **Node.js**: 20+
- **Package Manager**: pnpm 10.0.0
- **Test Method**: 5 runs per framework, averaged

### Dev Startup Time

Time from running `dev` command to dev server ready (browser opened):

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Addfox** | 2.04s | 1.95s | 2.19s | 2.19, 2.01, 1.95, 2.00, 2.05 |
| **Extension.js** | 2.34s | 1.95s | 2.75s | 1.95, 2.21, 2.75, 2.35, 2.46 |
| **WXT** | 2.36s | 2.31s | 2.40s | 2.40, 2.35, 2.39, 2.33, 2.31 |
| **Plasmo** | 3.39s | 3.31s | 3.57s | 3.34, 3.38, 3.36, 3.57, 3.31 |

### Build Time

Time to complete production build:

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Addfox** | 1.51s | 1.47s | 1.67s | 1.67, 1.48, 1.47, 1.48, 1.47 |
| **Extension.js** | 1.57s | 1.55s | 1.60s | 1.60, 1.56, 1.59, 1.55, 1.57 |
| **WXT** | 1.95s | 1.92s | 1.98s | 1.98, 1.92, 1.97, 1.92, 1.94 |
| **Plasmo** | 2.80s | 2.76s | 2.94s | 2.94, 2.76, 2.77, 2.78, 2.76 |

### Build Output Size

| Framework | Size |
|-----------|------|
| **WXT** | 832 KB |
| **Addfox** | 840 KB |
| **Plasmo** | 1,365 KB |
| **Extension.js** | 1,859 KB |

## Summary

| Framework | Dev Startup | Build Time | Output Size |
|-----------|-------------|------------|-------------|
| **Addfox** | 🥇 2.04s | 🥇 1.51s | 🥈 840 KB |
| **Extension.js** | 🥈 2.34s | 🥈 1.57s | 4th 1,859 KB |
| **WXT** | 🥉 2.36s | 🥉 1.95s | 🥇 832 KB |
| **Plasmo** | 4th 3.39s | 4th 2.80s | 🥉 1,365 KB |

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

### 4. Batch Benchmark (5 runs with average)

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
- ⚠️ **Plasmo**: Placeholder - needs implementation
