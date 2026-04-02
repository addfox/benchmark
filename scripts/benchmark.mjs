/**
 * Benchmark: dev (command start → ready/browser) and build (time + output size).
 * Reference: https://github.com/rstackjs/build-tools-performance
 *
 * Metrics:
 * - dev: time from `dev` command start until "ready" (first compilation / dev server ready).
 * - build: build command duration (ms) and output directory size (bytes / kB).
 */

import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pc from "picocolors";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CASES = [
  {
    name: "addfox",
    cwd: join(ROOT, "addfox"),
    devScript: "dev",
    buildScript: "build",
    /** Rsbuild / addfox dev: first successful compile */
    readyRegex: /built in|ready|\[Addfox\]/i,
    distDir: ".addfox/extension/extension-chromium",
  },
  // {
  //   name: "plasmo",
  //   cwd: join(ROOT, "plasmo"),
  //   devScript: "dev",
  //   buildScript: "build",
  //   readyRegex: /ready in|Ready in|compiled/i,
  //   distDir: "build/chrome-mv3-dev",
  // },
  // {
  //   name: "extensionjs",
  //   cwd: join(ROOT, "extensionjs"),
  //   devScript: "dev",
  //   buildScript: "build",
  //   readyRegex: /ready|compiled|listening/i,
  //   distDir: "dist",
  // },
  // {
  //   name: "parcel-extension",
  //   cwd: join(ROOT, "parcel-extension"),
  //   devScript: "dev",
  //   buildScript: "build",
  //   readyRegex: /Built in|ready/i,
  //   distDir: "dist",
  // },
  {
    name: "wxt",
    cwd: join(ROOT, "wxt"),
    devScript: "dev",
    buildScript: "build",
    /** WXT wraps Vite; dev prints Vite "ready" / Local URL */
    readyRegex: /ready in|Local:|VITE|listening/i,
    distDir: ".output/chrome-mv3",
  },
];

function getDirSizeBytes(dir) {
  try {
    let total = 0;
    const walk = (p) => {
      const entries = readdirSync(p, { withFileTypes: true });
      for (const e of entries) {
        const full = join(p, e.name);
        if (e.isDirectory()) walk(full);
        else total += statSync(full).size;
      }
    };
    walk(dir);
    return total;
  } catch {
    return 0;
  }
}

function runDevTiming(caseConfig) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn("pnpm", ["run", caseConfig.devScript], {
      cwd: caseConfig.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });

    let resolved = false;
    const finish = (ms) => {
      if (resolved) return;
      resolved = true;
      try {
        child.kill("SIGTERM");
      } catch {}
      resolve(ms);
    };

    const onData = (data) => {
      const text = data.toString();
      if (caseConfig.readyRegex.test(text)) finish(Date.now() - start);
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    const timeout = 120000;
    const t = setTimeout(() => {
      finish(-1);
    }, timeout);

    child.on("exit", (code) => {
      clearTimeout(t);
      if (!resolved) resolve(code === 0 ? Date.now() - start : -1);
    });
    child.on("error", (err) => {
      clearTimeout(t);
      if (!resolved) reject(err);
    });
  });
}

function runBuildTiming(caseConfig) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn("pnpm", ["run", caseConfig.buildScript], {
      cwd: caseConfig.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });

    const prefix = `[${caseConfig.name}]`;
    const onData = (data) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        console.log(`${prefix} ${line}`);
      }
    };
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);

    child.on("exit", (code) => {
      const elapsed = Date.now() - start;
      const distPath = join(caseConfig.cwd, caseConfig.distDir);
      const sizeBytes = getDirSizeBytes(distPath);
      resolve({
        timeMs: code === 0 ? elapsed : -1,
        sizeBytes,
        sizeKb: (sizeBytes / 1024).toFixed(2),
      });
    });
    child.on("error", reject);
  });
}

const devOnly = process.argv.includes("--dev-only");
const buildOnly = process.argv.includes("--build-only");

function createEmptyResult(name) {
  return { name, devMs: null, buildMs: null, sizeKb: null };
}

function toResultMap() {
  const map = new Map();
  for (const c of CASES) {
    map.set(c.name, createEmptyResult(c.name));
  }
  return map;
}

async function runDevBenchmarksConcurrently(resultMap) {
  const tasks = CASES.map(async (c) => {
    console.log(pc.cyan(`start dev benchmark: ${c.name}`));
    const devMs = await runDevTiming(c);
    resultMap.get(c.name).devMs = devMs;
    const devStr = devMs >= 0 ? `${devMs} ms` : "timeout/fail";
    console.log(pc.green(`done dev benchmark: ${c.name} -> ${devStr}`));
  });
  await Promise.all(tasks);
}

async function runBuildBenchmarksConcurrently(resultMap) {
  const tasks = CASES.map(async (c) => {
    console.log(pc.cyan(`start build benchmark: ${c.name}`));
    const build = await runBuildTiming(c);
    resultMap.get(c.name).buildMs = build.timeMs;
    resultMap.get(c.name).sizeKb = build.sizeKb;
    console.log(pc.green(`done build benchmark: ${c.name} -> ${build.timeMs} ms, ${build.sizeKb} kB`));
  });
  await Promise.all(tasks);
}

async function main() {
  console.log(pc.bold("Extension build benchmark\n"));
  console.log("Metrics: dev = time from command start to ready; build = duration + output size.\n");

  const resultMap = toResultMap();
  if (!buildOnly) {
    console.log(pc.bold("Running dev benchmarks in parallel...\n"));
    await runDevBenchmarksConcurrently(resultMap);
  }
  if (!devOnly) {
    console.log(pc.bold("\nRunning build benchmarks in parallel...\n"));
    await runBuildBenchmarksConcurrently(resultMap);
  }

  const results = CASES.map((c) => resultMap.get(c.name));
  console.log(pc.bold("\nSummary"));
  console.log("Name            | Dev (ms) | Build (ms) | Size (kB)");
  console.log("----------------|----------|------------|----------");
  for (const r of results) {
    const dev = r.devMs != null ? String(r.devMs) : "-";
    const build = r.buildMs != null ? String(r.buildMs) : "-";
    const size = r.sizeKb != null ? r.sizeKb : "-";
    console.log(`${r.name.padEnd(15)} | ${dev.padStart(8)} | ${build.padStart(10)} | ${size}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
