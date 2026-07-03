---
name: run-benchmark
description: |
  Run the full extension-build-benchmark comparison (dev startup, build time, and
  output size for addfox / wxt / plasmo / extensionjs) and compare this round's
  addfox numbers against the previous baseline.
  Use when the user says "run the benchmark", "re-run the benchmark",
  "benchmark comparison", or "compare addfox against the previous data".
triggers:
  - run benchmark
  - re-run benchmark
  - rerun benchmark
  - benchmark comparison
  - compare addfox time
  - benchmark
---

# Run Benchmark Skill

Inside the `extension-build-benchmark` repo, build **one identical extension** with
addfox / wxt / plasmo / extensionjs and measure three metrics for comparison:

- **Dev startup time**: from the `dev` command until the browser has loaded the
  extension (ready).
- **Build time**: total time + the framework's self-reported pure build time.
- **Output size**: production build output (source maps excluded).

> Typical request: "re-run a round and compare this round's addfox against the previous one."

---

## Key principle: the benchmark environment must be quiet (otherwise numbers aren't comparable)

Time metrics are **extremely sensitive** to machine load. Measured: when several
`chrome-devtools-mcp` / other Chrome instances are contending for CPU, all four
frameworks' build times rise by **~16–22% proportionally** (that's load, not a
framework change), and dev-server startup jumped from 0.36s to 14.86s.
**Such data must not be used for a version comparison.**

Before running, always:

1. Close other browsers and any MCP / background processes that spawn Chrome
   (e.g. `chrome-devtools-mcp`).
2. Confirm the CPU is idle with a fixed compute probe (~0.3s when idle; if it's
   noticeably higher, something is still stealing CPU — do not start):
   ```bash
   node -e "const s=Date.now();let x=0;for(let i=0;i<3e8;i++)x+=i;console.log('busyloop_ms='+(Date.now()-s))"
   ```
3. Clean up leftover browsers and ports:
   ```bash
   taskkill //F //IM chrome.exe 2>/dev/null; taskkill //F //IM msedge.exe 2>/dev/null
   # free the ports used by dev: 23333 / 4299
   for p in 23333 4299; do for pid in $(netstat -ano | grep -E ":$p\b" | awk '{print $NF}' | sort -u | grep -E '^[0-9]+$'); do taskkill //F //PID $pid 2>/dev/null; done; done
   ```

> ⚠️ Between every dev run the suite runs `taskkill /F /IM chrome.exe` and
> `/IM msedge.exe`, which **closes all Chrome / Edge windows on the machine**.
> Warn the user to save and close personal browsers before starting.

---

## Execution flow (strictly serial)

Run from the benchmark repo root:

```bash
# 0) Dependencies (first time, or after changing the addfox packages)
pnpm install --no-frozen-lockfile

# 1) Record the "previous round" as the baseline (BEFORE overwriting the final results!)
node scripts/benchmark-compare.mjs snapshot
#    -> baseline/build.json, baseline/dev.json

# 2) build suite: 4 frameworks x (1 warm-up + 8 scored runs), serial
node scripts/run-benchmark-suite.mjs build     # -> benchmark-build-final.json

# 3) dev suite: 4 frameworks x (1 warm-up + 8 scored runs), serial
node scripts/run-benchmark-suite.mjs dev       # -> benchmark-dev-final.json

# 4) Compare this round vs baseline (focus on addfox)
node scripts/benchmark-compare.mjs
```

Each suite can take several minutes per run (8x4 runs + cooldowns). Run them as
background tasks and read the results afterwards, and **do not run build and dev
in parallel** (they steal CPU from each other and pollute the timings).

### Fixes already baked into the flow (enforced by the script, not by hand)

`benchmarkFramework()` in `scripts/run-benchmark-suite.mjs` (together with
`closeBrowserAndCooldown`) implements:

- **Serial**: one framework finishes all 8 runs before the next; each run fully
  wraps up before the next begins.
- **The browser launched each run is auto-closed**: after every dev run (including
  the warm-up and the last one) it immediately calls `killBrowserProcesses()`
  (chrome + msedge), leaving no lingering browser process.
- **2s delay after close**: `POST_RUN_COOLDOWN_MS = 2000` — close browser → wait 2s
  → free ports → next run, so ports / user-data-dir locks are released and don't
  cause cascading failures.

To adjust the cooldown, change the single `POST_RUN_COOLDOWN_MS` constant.

---

## Results and comparison

- Raw results: `benchmark-build-final.json`, `benchmark-dev-final.json`
  (fields: `avg / min / max / all / avgPure / avgSize`).
- `benchmark-compare.mjs` prints each framework's baseline→current change for
  build total / pure build / size and for dev startup, plus a dedicated addfox
  conclusion.
- **Time comparisons are only meaningful between two rounds taken in a quiet
  environment.** Size (`avgSize`) is load-independent and can be compared anytime.

Ready markers (`readyPattern` in `scripts/dev-benchmark.mjs`):

| Framework | dev ready marker | Source |
|-----------|------------------|--------|
| addfox | `extensions loaded` | launcher prints `<browser> started, extensions loaded.` |
| wxt | `Opened browser in` | |
| plasmo | `Extension re-packaged` | |
| extensionjs | `compiled successfully` / `Edge Add-on ready` | |

Build ready markers are in `scripts/build-benchmark.mjs` (addfox uses `Extension size`;
pure build time is taken from `Rsbuild build <ms>`).

---

## Known issue: addfox dev used to show as N/A (fixed)

**Root cause (now fixed):** `scripts/dev-benchmark.mjs` spawned `addfox dev` with
`stdio: ["ignore", "pipe", "pipe"]`. addfox dev registers keyboard shortcuts by
reading `process.stdin`; when stdin is ignored, the dev process exits early (before
launching the browser) and **never prints `edge started, extensions loaded.`**.
This made every addfox dev run time out and appear as `addfox: null`, even though a
direct `pnpm run dev` in `benchmark/addfox` worked fine.

**Fix applied**:

- `scripts/dev-benchmark.mjs`: changed child spawn `stdio` to `["pipe", "pipe", "pipe"]`
  so addfox dev has a real stdin fd.
- `scripts/run-benchmark-suite.mjs`: changed the wrapper spawn of `dev-benchmark.mjs`
  to `stdio: ["pipe", "pipe", "pipe"]` so stdin is preserved through the chain.
- Also hardened `dev-benchmark.mjs` to match the ready marker against accumulated
  stdout with ANSI codes stripped, so line fragmentation and color codes can't cause
  false negatives.

**Verification**: after the fix, addfox dev measures reliably in the suite and prints
`edge started, extensions loaded.` within a few seconds.

---

## Interpreting results under non-ideal load

Build time is CPU-sensitive. If the machine is under sustained background load, all
frameworks' build times rise proportionally (e.g. +16–22%). **Do not interpret that
uniform shift as a framework regression.** Use these load-independent signals instead:

- **Output size** (`avgSize`) — unaffected by CPU load.
- **Relative ranking** between frameworks in the same round — still meaningful if all
  ran under the same load.
- **Dev startup** — also CPU-sensitive, but the ready-line marker is binary: it either
  appears or it doesn't. If it appears, the number is valid for that environment.

For a clean version-over-version comparison, run the suites when the CPU probe is
near idle (~0.3s on this machine).

---

## Related files

| File | Purpose |
|------|---------|
| `scripts/run-benchmark-suite.mjs` | 8-run-averaged build/dev driver (serial + close browser each run + 2s cooldown) |
| `scripts/dev-benchmark.mjs` | Single dev-startup timing, stops the clock on `readyPattern` |
| `scripts/build-benchmark.mjs` | Single build timing (total + pure build + size) |
| `scripts/benchmark-compare.mjs` | `snapshot` records the baseline / `compare` diffs this round vs baseline |
| `baseline/build.json`, `baseline/dev.json` | Previous-round baseline data |
| `benchmark-build-final.json`, `benchmark-dev-final.json` | Most recent round's results |
| `README.md` | Published comparison tables |
