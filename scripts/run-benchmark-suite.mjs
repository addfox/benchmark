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
const RUNS = 5;

function killBrowserProcesses() {
  return new Promise((resolve) => {
    // Kill Chrome processes started by extensions
    exec('taskkill /F /IM chrome.exe 2>nul', () => resolve());
    setTimeout(() => resolve(), 1000);
  });
}

function runSingleBenchmark(type, framework) {
  return new Promise((resolve) => {
    const script = type === "dev" ? "dev-benchmark.mjs" : "build-benchmark.mjs";
    const proc = spawn("node", [join(ROOT, "scripts", script), framework], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let killed = false;

    proc.stdout?.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      output += data.toString();
    });

    // Timeout for dev tests (browser needs to open)
    const timeout = type === "dev" ? 60000 : 120000;
    const timer = setTimeout(async () => {
      if (!killed) {
        killed = true;
        proc.kill("SIGTERM");
        await killBrowserProcesses();
        // Try to extract time from output even if timeout
        const match = output.match(/总耗时[:：]\s*(\d+\.?\d*)s/);
        if (match) {
          resolve({ success: true, timeSec: parseFloat(match[1]) });
        } else {
          resolve({ success: false, timeSec: null });
        }
      }
    }, timeout);

    proc.on("close", async (code) => {
      clearTimeout(timer);
      if (!killed) {
        killed = true;
        await killBrowserProcesses();
        
        // Extract time from output
        const match = output.match(/总耗时[:：]\s*(\d+\.?\d*)s/);
        if (match) {
          resolve({ success: true, timeSec: parseFloat(match[1]) });
        } else {
          resolve({ success: false, timeSec: null });
        }
      }
    });
  });
}

async function benchmarkFramework(type, framework) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${framework.toUpperCase()} ${type.toUpperCase()}`);
  console.log('='.repeat(60));
  
  const results = [];
  
  for (let i = 1; i <= RUNS; i++) {
    console.log(`\nRun ${i}/${RUNS}...`);
    const result = await runSingleBenchmark(type, framework);
    
    if (result.success && result.timeSec) {
      results.push(result.timeSec);
      console.log(`✓ ${result.timeSec.toFixed(2)}s`);
    } else {
      console.log(`✗ Failed`);
    }
    
    // Cool down between runs
    if (i < RUNS) {
      console.log("Cooling down...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  if (results.length === 0) {
    return null;
  }
  
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  
  return { avg, min, max, all: results };
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
  console.log("\n" + "=".repeat(70));
  console.log(`${type.toUpperCase()} RESULTS (Average of ${RUNS} runs)`);
  console.log("=".repeat(70));
  console.log("Framework    | Avg (s) | Min (s) | Max (s) | Runs");
  console.log("-".repeat(70));
  
  for (const fw of FRAMEWORKS) {
    const r = allResults[fw];
    if (r) {
      const runs = r.all.map(t => t.toFixed(2)).join(", ");
      console.log(`${fw.padEnd(12)} | ${r.avg.toFixed(2).padStart(7)} | ${r.min.toFixed(2).padStart(7)} | ${r.max.toFixed(2).padStart(7)} | ${runs}`);
    } else {
      console.log(`${fw.padEnd(12)} | Failed`);
    }
  }
  
  // Save results
  const filename = join(ROOT, `benchmark-${type}-final.json`);
  fs.writeFileSync(filename, JSON.stringify(allResults, null, 2));
  console.log("=".repeat(70));
  console.log(`\nResults saved to: ${filename}`);
  
  return allResults;
}

main().catch(console.error);
