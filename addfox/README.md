# Benchmark Addfox

Benchmark case: same extension with addfox (React + Tailwind 3)

## Quick Start

```bash
# Install dependencies and link addfox
pnpm install

# Dev mode
pnpm run dev

# Build
pnpm run build
```

## Linking Addfox from Source

This project uses pnpm link to connect to the addfox monorepo at `../../addfox`.

### First Time Setup

1. **In addfox root** (`../../addfox`):
   ```bash
   pnpm run setup:benchmark
   # or: node scripts/setup-benchmark-links.mjs
   ```

2. **In this directory**:
   ```bash
   pnpm run link:addfox
   # or: node scripts/link-addfox.mjs
   ```

### Verify Link

```bash
pnpm list --depth=0
```

You should see packages pointing to `../../addfox/packages/*`

### Unlink (Restore npm packages)

```bash
pnpm unlink addfox @addfox/utils @addfox/core @addfox/common @addfox/cli
pnpm unlink @addfox/rsbuild-plugin-extension-entry @addfox/rsbuild-plugin-extension-hmr
pnpm unlink @addfox/rsbuild-plugin-extension-manifest @addfox/rsbuild-plugin-extension-monitor
pnpm install
```

## Scripts

- `pnpm run dev` - Start dev server with hot reload
- `pnpm run build` - Build production extension
- `pnpm run link:addfox` - Link to addfox source packages

## Notes

- Uses `workspace:*` protocol in package.json for automatic workspace linking
- No yalc required - pure pnpm workspace/link workflow
