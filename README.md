# Extension Build Benchmark

> **Addfox 0.2.5 Performance Update**: Compared to Addfox 0.2.0, the latest version delivers a significant dev startup improvement:
>
> - **Dev startup: 2.39s → 1.92s (~1.25x faster / 0.8x the time, ~0.47s saved)**
> - **Build time: 1.47s → 1.48s (~1.0x, essentially unchanged)**
> - **Output size: unchanged at 837 KB**
>
> Addfox now ranks first in dev startup time among the four frameworks in this benchmark, while maintaining the fastest build time.

This repository benchmarks four browser extension frameworks by building the **same extension** with identical functionality. The goal is to compare **dev startup time**, **build time**, and **output size**.

Reference: [rstackjs/build-tools-performance](https://github.com/rstackjs/build-tools-performance)

## Agent Prompt

If you are an AI agent, run the benchmark with the following prompt:

> Run the extension build benchmark in this repository. Work from the repository root. First, ensure the environment is quiet: close any unnecessary browsers and background apps, kill stray `chrome.exe` / `msedge.exe` processes, and free ports `23333` and `4299`. Then run `node scripts/benchmark-compare.mjs snapshot` to record the current baseline, run `node scripts/run-benchmark-suite.mjs build`, then `node scripts/run-benchmark-suite.mjs dev`, and finally `node scripts/benchmark-compare.mjs` to compare the new results against the baseline. Report the average build time, dev startup time, and output size for each framework, with special attention to Addfox.

## Frameworks

| Directory | Framework | Version | Bundler | Description |
|-----------|-----------|---------|---------|-------------|
| `addfox/` | Addfox | 0.2.5 | Rsbuild 2.1.1 | Rsbuild-based framework (`addfox.config.ts`, `defineConfig` + `pluginReact`) |
| `wxt/` | WXT | 0.20.27 | Vite 8.1.2 | WXT framework |
| `plasmo/` | Plasmo | 0.90.5 | Parcel 2.9.3 | Plasmo framework |
| `extensionjs/` | Extension.js | 4.0.1 | Rspack 2.1.2 | Extension.js framework |

## Benchmark Results

### Environment

- **OS**: Windows
- **Browser**: Microsoft Edge
- **Node.js**: 24.16.0
- **Package Manager**: pnpm 10.0.0
- **Test Method**: 8 runs per framework, averaged (warm-up run before each suite to eliminate cold-start bias)
- **Last Updated**: 2026-07-01

### Dev Startup Time

Time from running `dev` command to dev server ready (including browser launch and extension installation where applicable):

> **Note:** All frameworks automatically open the browser and install the extension during dev. Each framework was tested with 8 runs after a warm-up run to eliminate cold-start bias.

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Addfox** | 1.92s | 1.88s | 1.94s | 1.88, 1.93, 1.92, 1.92, 1.94, 1.91, 1.93, 1.90 |
| **WXT** | 2.09s | 2.05s | 2.16s | 2.16, 2.09, 2.08, 2.06, 2.05, 2.09, 2.08, 2.11 |
| **Extension.js** | 2.25s | 2.21s | 2.33s | 2.24, 2.24, 2.21, 2.33, 2.23, 2.26, 2.23, 2.27 |
| **Plasmo** | 3.12s | 3.08s | 3.22s | 3.08, 3.08, 3.08, 3.10, 3.14, 3.12, 3.14, 3.22 |

### Build Time

Time to complete production build (total time from running the command to build complete, including CLI startup overhead):

| Framework | Average | Min | Max | Runs |
|-----------|---------|-----|-----|------|
| **Addfox** | 1.48s | 1.46s | 1.50s | 1.49, 1.50, 1.50, 1.46, 1.48, 1.48, 1.47, 1.49 |
| **Extension.js** | 1.75s | 1.62s | 2.11s | 1.89, 1.73, 2.11, 1.68, 1.64, 1.64, 1.62, 1.65 |
| **WXT** | 1.91s | 1.82s | 2.06s | 1.98, 1.84, 1.88, 2.06, 1.87, 1.82, 1.84, 2.00 |
| **Plasmo** | 2.69s | 2.66s | 2.77s | 2.77, 2.67, 2.72, 2.68, 2.67, 2.69, 2.67, 2.66 |

### Build Output Size

Production build output (excluding source maps):

| Framework | Size | Target |
|-----------|------|--------|
| **WXT** | 810 KB | `chrome-mv3` |
| **Addfox** | 837 KB | `extension-chromium` |
| **Plasmo** | 1.36 MB | `chrome-mv3-prod` |
| **Extension.js** | 1.45 MB | `chromium` (no source maps; `chrome`/`edge` builds are ~20 MB each with source maps) |

> **Measurement method:** Output directory is cleaned before each build. Size is the exact sum of all file bytes in the production output directory (source maps excluded).

## Summary

| Framework | Version | Dev Startup | Build Time | Output Size |
|-----------|---------|-------------|------------|-------------|
| **Addfox** | 0.2.5 | 🥇 1.92s | 🥇 1.48s | 🥈 837 KB |
| **WXT** | 0.20.27 | 🥈 2.09s | 🥉 1.91s | 🥇 810 KB |
| **Extension.js** | 4.0.1 | 🥉 2.25s | 🥈 1.75s | 4th 1.45 MB |
| **Plasmo** | 0.90.5 | 4th 3.12s | 4th 2.69s | 🥉 1.36 MB |

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
