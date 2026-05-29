# Benchmark: Extension.js

Benchmark case: same extension as the other frameworks in this repo (React + Tailwind 3, popup / options / sidepanel / devtools / space / background / content).

See the [parent benchmark README](../README.md) for full comparison results and shared tech stack.

## Quick start

From the monorepo root:

```bash
pnpm install --no-frozen-lockfile
pnpm run copy-icons
```

From this directory:

```bash
pnpm install
pnpm run dev
pnpm run build
```

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `extension dev` (system Edge) | Dev server + hot reload, opens Edge |
| `build` | `extension build` | Production build (`dist/`, zip optional via config) |

## Configuration

- **`extension.config.js`** — browser, `dev` / `build` commands, starting URLs, polyfill, logging.
- **`package.json`** — `"type": "module"` so Node loads `extension.config.js` as ESM without warnings.

Default dev browser is **Edge**. The `dev` script uses the system Edge binary instead of Extension.js managed browser cache (avoids `Edge is not available in the managed browser cache` on Windows):

```text
C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
```

If Edge is installed elsewhere, update the `--chromium-binary` path in `package.json`.

### Optional: managed Edge cache

Extension.js can install Edge into its cache:

```bash
pnpm exec extension install edge
```

On many Windows setups this only links to an existing system install and `extension dev --browser edge` may still fail. Prefer the `--chromium-binary` script in `package.json`.

## Build output

- Dev: under `dist/extension-js/` (browser-specific subdirs per Extension.js).
- Production: `extension build` with `browser: "edge"` and optional zip in `extension.config.js` (`benchmark-extension.zip`).

## Benchmark notes

- Compared in [../README.md](../README.md) as **Extension.js** (Webpack-based CLI `extension`).
- Dev timing includes browser launch and extension load when using `pnpm run dev`.
- Production size is measured without source maps; Chromium/Edge artifacts with source maps are much larger.
