#!/usr/bin/env node
/**
 * Run benchmark 5 times and calculate average
 * Usage: node scripts/benchmark-average.mjs [dev|build]
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FRAMEWORKS = ["addfox", "wxt", "plasmo", "extensionjs"];
const RUNS = 5;

function runBenchmark(type, framework) {
  return new Promise((resolve) => {
    const script = type === "dev" ? "dev-benchmark.mjs" : "build-benchmark.mjs";
    const cmd = `node scripts/${script} ${framework}`;
    
    console.log(`  Run: ${cmd}`);
    
    const proc = spawn("node", [join(ROOT, "scripts", script), framework], {
      cwd: ROOT,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      // Try to extract time from output
      const timeMatch = stdout.match(/(\d+\.?\d*)s/) || stderr.match(/(\d+\.?\d*)s/);
      const timeStr = stdout.match(/(\d+\.?\d*)ms/) || stderr.match(/(\d+\.?\d*)ms/);
      
      let timeMs = null;
      if (timeMatch) {
        timeMs = parseFloat(timeMatch[1]) * 1000;
      } else if (timeStr) {
        timeMs = parseFloat(timeStr[1]);
      }
      
      resolve({
        success: code === 0,
        timeMs,
        output: stdout + stderr,
      });
    });
  });
}

async function runMultipleBenchmarks(type, framework) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking ${framework} ${type} (${RUNS} runs)`);
  console.log('='.repeat(60));
  
  const results = [];
  
  for (let i = 1; i <= RUNS; i++) {
    console.log(`\n--- Run ${i}/${RUNS} ---`);
    const result = await runBenchmark(type, framework);
    
    if (result.success && result.timeMs) {
      results.push(result.timeMs);
      console.log(`✓ Success: ${(result.timeMs / 1000).toFixed(2)}s`);
    } else {
      console.log(`✗ Failed or no time captured`);
      console.log(`Output: ${result.output.slice(-200)}`);
    }
    
    // Wait between runs
    if (i < RUNS) {
      console.log("Waiting 3s before next run...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  if (results.length === 0) {
    return { avg: null, min: null, max: null, all: [] };
  }
  
  const avg = results.reduce((a, b) => a + b, 0) / results.length;
  const min = Math.min(...results);
  const max = Math.max(...results);
  
  return { avg, min, max, all: results };
}

async function main() {
  const type = process.argv[2];
  
  if (!type || !["dev", "build"].includes(type)) {
    console.log("Usage: node scripts/benchmark-average.mjs [dev|build]");
    process.exit(1);
  }
  
  console.log(`\n🏁 Starting ${type.toUpperCase()} Benchmark - ${RUNS} runs per framework`);
  console.log(`Frameworks: ${FRAMEWORKS.join(", ")}`);
  
  const allResults = {};
  
  for (const framework of FRAMEWORKS) {
    const result = await runMultipleBenchmarks(type, framework);
    allResults[framework] = result;
  }
  
  // Print summary table
  console.log("\n" + "=".repeat(70));
  console.log(`${type.toUpperCase()} BENCHMARK RESULTS (${RUNS} runs average)`);
  console.log("=".repeat(70));
  console.log("Framework    | Average | Min     | Max     | All Times");
  console.log("-".repeat(70));
  
  for (const framework of FRAMEWORKS) {
    const r = allResults[framework];
    if (r.avg) {
      const allTimes = r.all.map(t => (t/1000).toFixed(2) + "s").join(", ");
      console.log(
        `${framework.padEnd(12)} | ${(r.avg/1000).toFixed(2).padEnd(6)}s | ${(r.min/1000).toFixed(2).padEnd(6)}s | ${(r.max/1000).toFixed(2).padEnd(6)}s | ${allTimes}`
      );
    } else {
      console.log(`${framework.padEnd(12)} | Failed`);
    }
  }
  console.log("=".repeat(70));
  
  // Save results to file
  const fs = await import("node:fs");
  const resultsFile = join(ROOT, `benchmark-${type}-results.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
  console.log(`\nResults saved to: ${resultsFile}`);
}

main().catch(console.error);
