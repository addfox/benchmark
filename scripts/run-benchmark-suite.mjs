#!/usr/bin/env node
/**
 * Run benchmark 5 times and calculate average
 * Usage: node scripts/run-benchmark-suite.mjs [dev|build]
 */

import { spawn, exec } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FRAMEWORKS = ["addfox", "wxt", "extensionjs", "plasmo"];
const RUNS = 8;

function killBrowserProcesses() {
  return new Promise((resolve) => {
    exec('taskkill /F /IM chrome.exe 2>nul', () => {
      exec('taskkill /F /IM msedge.exe 2>nul', () => resolve());
    });
    setTimeout(() => resolve(), 1000);
  });
}

function killPortProcesses() {
  return new Promise((resolve) => {
    const ports = [23333, 4299];
    let completed = 0;
    for (const port of ports) {
      exec(`netstat -ano | findstr ":${port}"`, (err, stdout) => {
        if (!err && stdout) {
          const lines = stdout.trim().split(/\r?\n/);
          const pids = new Set();
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid)) {
              pids.add(pid);
            }
          }
          let killed = 0;
          for (const pid of pids) {
            exec(`taskkill /F /PID ${pid} 2>nul`, () => {
              killed++;
              if (killed === pids.size) {
                completed++;
                if (completed === ports.length) resolve();
              }
            });
          }
          if (pids.size === 0) {
            completed++;
            if (completed === ports.length) resolve();
          }
        } else {
          completed++;
          if (completed === ports.length) resolve();
        }
      });
    }
    setTimeout(() => resolve(), 2000);
  });
}

function runSingleBenchmark(type, framework) {
  return new Promise((resolve) => {
    const script = type === "dev" ? "dev-benchmark.mjs" : "build-benchmark.mjs";
    const proc = spawn("node", [join(ROOT, "scripts", script), framework], {
      cwd: ROOT,
      stdio: ["pipe", "pipe", "pipe"], // stdin 需要保留给 dev-benchmark 及其子进程 addfox dev
    });

    let output = "";
    let killed = false;

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    const timeout = type === "dev" ? 60000 : 120000;
    const timer = setTimeout(async () => {
      if (!killed) {
        killed = true;
        proc.kill("SIGTERM");
        if (type === "dev") {
          await killBrowserProcesses();
          await killPortProcesses();
        }
        extractAndResolve(type, output, resolve);
      }
    }, timeout);

    proc.on("close", async (code) => {
      clearTimeout(timer);
      if (!killed) {
        killed = true;
        if (type === "dev") {
          await killBrowserProcesses();
          await killPortProcesses();
        }
        extractAndResolve(type, output, resolve);
      }
    });
  });
}

function extractAndResolve(type, output, resolve) {
  // 尝试提取新的 JSON 结果行（build-benchmark.mjs 改进版）
  const jsonMatch = output.match(/__BENCHMARK_RESULT__({.+})/);
  if (jsonMatch) {
    try {
      const result = JSON.parse(jsonMatch[1]);
      resolve({
        success: true,
        timeSec: result.totalSec,
        pureBuildSec: result.pureBuildSec ?? null,
        sizeKb: result.sizeKb ?? null,
      });
      return;
    } catch {
      // fallback to legacy parsing
    }
  }

  // 旧版解析：从人类可读输出中提取总耗时
  const match = output.match(/总耗时[:：]\s*(\d+\.?\d*)s/);
  if (match) {
    resolve({ success: true, timeSec: parseFloat(match[1]), pureBuildSec: null, sizeKb: null });
  } else {
    resolve({ success: false, timeSec: null, pureBuildSec: null, sizeKb: null });
  }
}

async function benchmarkFramework(type, framework) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${framework.toUpperCase()} ${type.toUpperCase()}`);
  console.log('='.repeat(60));

  const results = [];
  const pureBuildResults = [];
  const sizeResults = [];

  // 每次 run 结束后：先彻底关闭本次启动的浏览器，再等待 POST_RUN_COOLDOWN_MS，
  // 确保浏览器进程、23333/4299 端口与用户数据目录锁都已释放，下一次 run 从干净状态开始。
  // 这保证了严格串行：一个 run（含浏览器）完全收尾后，才进入下一个 run。
  const POST_RUN_COOLDOWN_MS = 2000;
  const closeBrowserAndCooldown = async (label) => {
    if (type === "dev") {
      await killBrowserProcesses(); // 自动关闭本次 run 启动的浏览器（chrome / msedge）
    }
    await killPortProcesses();
    console.log(`${label} 关闭浏览器，冷却 ${POST_RUN_COOLDOWN_MS / 1000}s...`);
    await new Promise((r) => setTimeout(r, POST_RUN_COOLDOWN_MS));
    await killPortProcesses();
  };

  // Warm-up run: 不计入结果，消除冷启动影响
  console.log(`\n[Warm-up] 预热运行（不计入结果）...`);
  await runSingleBenchmark(type, framework);
  await closeBrowserAndCooldown("[Warm-up]");

  for (let i = 1; i <= RUNS; i++) {
    console.log(`\nRun ${i}/${RUNS}...`);
    const result = await runSingleBenchmark(type, framework);

    if (result.success && result.timeSec) {
      results.push(result.timeSec);
      if (result.pureBuildSec !== null) {
        pureBuildResults.push(result.pureBuildSec);
      }
      if (result.sizeKb !== null) {
        sizeResults.push(result.sizeKb);
      }
      console.log(`✓ Total: ${result.timeSec.toFixed(2)}s` +
        (result.pureBuildSec !== null ? ` | Pure: ${result.pureBuildSec.toFixed(2)}s` : "") +
        (result.sizeKb !== null ? ` | Size: ${result.sizeKb.toFixed(0)} KB` : ""));
    } else {
      console.log(`✗ Failed`);
    }

    // 串行保证：无论成功或失败，本次 run 都关闭浏览器 + 冷却后再进入下一次。
    if (i < RUNS) {
      await closeBrowserAndCooldown(`Run ${i}/${RUNS}`);
    } else if (type === "dev") {
      await killBrowserProcesses(); // 最后一次也要关闭浏览器，避免残留进程
      await killPortProcesses();
    }
  }

  if (results.length === 0) {
    return null;
  }

  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);

  const avgPure = pureBuildResults.length > 0
    ? pureBuildResults.reduce((a, b) => a + b, 0) / pureBuildResults.length
    : null;

  const avgSize = sizeResults.length > 0
    ? sizeResults.reduce((a, b) => a + b, 0) / sizeResults.length
    : null;

  return { avg, min, max, all: results, avgPure, avgSize };
}

async function main() {
  const type = process.argv[2];

  if (!type || !["dev", "build"].includes(type)) {
    console.log("Usage: node scripts/run-benchmark-suite.mjs [dev|build]");
    process.exit(1);
  }

  console.log(`🏁 ${type.toUpperCase()} Benchmark Suite`);
  console.log(`Frameworks: ${FRAMEWORKS.join(", ")}`);
  console.log(`Runs per framework: ${RUNS}`);

  const allResults = {};

  for (const fw of FRAMEWORKS) {
    allResults[fw] = await benchmarkFramework(type, fw);
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log(`${type.toUpperCase()} RESULTS (Average of ${RUNS} runs)`);
  console.log("=".repeat(80));

  if (type === "build") {
    console.log("Framework    | Avg Total | Avg Pure  | Size (KB) | Runs");
  } else {
    console.log("Framework    | Avg (s)   | Min (s)   | Max (s)   | Runs");
  }
  console.log("-".repeat(80));

  for (const fw of FRAMEWORKS) {
    const r = allResults[fw];
    if (r) {
      const runs = r.all.map(t => t.toFixed(2)).join(", ");
      if (type === "build" && r.avgPure !== null) {
        console.log(
          `${fw.padEnd(12)} | ${r.avg.toFixed(2).padStart(9)} | ${r.avgPure.toFixed(2).padStart(9)} | ${(r.avgSize ?? 0).toFixed(0).padStart(9)} | ${runs}`
        );
      } else {
        console.log(
          `${fw.padEnd(12)} | ${r.avg.toFixed(2).padStart(9)} | ${r.min.toFixed(2).padStart(9)} | ${r.max.toFixed(2).padStart(9)} | ${runs}`
        );
      }
    } else {
      console.log(`${fw.padEnd(12)} | Failed`);
    }
  }

  // Save results
  const filename = join(ROOT, `benchmark-${type}-final.json`);
  fs.writeFileSync(filename, JSON.stringify(allResults, null, 2));
  console.log("=".repeat(80));
  console.log(`\nResults saved to: ${filename}`);

  return allResults;
}

main().catch(console.error);
