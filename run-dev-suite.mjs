import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function killProcesses() {
  try { await execAsync('taskkill /F /IM msedge.exe 2>nul'); } catch {}
  try { await execAsync('taskkill /F /IM node.exe 2>nul'); } catch {}
}

function runDev(framework) {
  return new Promise((resolve) => {
    const proc = spawn("node", [`scripts/dev-benchmark.mjs`, framework], {
      cwd: "C:\\programs\\benchmark",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let resolved = false;

    const checkOutput = (data) => {
      const text = data.toString();
      output += text;
      
      if (!resolved) {
        const match = text.match(/总耗时[:：]\s*(\d+\.?\d*)s/);
        if (match) {
          resolved = true;
          resolve({ success: true, time: parseFloat(match[1]) });
          proc.kill();
        }
      }
    };

    proc.stdout?.on("data", checkOutput);
    proc.stderr?.on("data", checkOutput);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, time: null });
        proc.kill();
      }
    }, 60000);
  });
}

async function testFramework(framework) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${framework.toUpperCase()} DEV (Edge)`);
  console.log('='.repeat(60));
  
  const times = [];
  
  for (let i = 1; i <= 5; i++) {
    console.log(`\nRun ${i}/5...`);
    await killProcesses();
    await new Promise(r => setTimeout(r, 2000));
    
    const result = await runDev(framework);
    if (result.success) {
      times.push(result.time);
      console.log(`  ✓ ${result.time.toFixed(2)}s`);
    } else {
      console.log(`  ✗ Failed`);
    }
    
    await killProcesses();
    if (i < 5) {
      console.log("  Cooling down...");
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  if (times.length === 0) return null;
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return {
    avg,
    min: Math.min(...times),
    max: Math.max(...times),
    all: times
  };
}

async function main() {
  const frameworks = ["addfox", "wxt", "extensionjs", "plasmo"];
  const results = {};
  
  console.log("🏁 DEV Benchmark Suite (Edge Browser)");
  console.log("5 runs per framework\n");
  
  for (const fw of frameworks) {
    results[fw] = await testFramework(fw);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("DEV RESULTS - Edge Browser (Average of 5 runs)");
  console.log("=".repeat(70));
  console.log("Framework    | Avg (s) | Min (s) | Max (s) | All Times");
  console.log("-".repeat(70));
  
  for (const fw of frameworks) {
    const r = results[fw];
    if (r) {
      const times = r.all.map(t => t.toFixed(2)).join(", ");
      console.log(`${fw.padEnd(12)} | ${r.avg.toFixed(2).padStart(7)} | ${r.min.toFixed(2).padStart(7)} | ${r.max.toFixed(2).padStart(7)} | ${times}`);
    } else {
      console.log(`${fw.padEnd(12)} | Failed`);
    }
  }
  console.log("=".repeat(70));
  
  // Save results
  const fs = await import("fs");
  fs.writeFileSync(
    "C:\\programs\\benchmark\\benchmark-dev-edge.json",
    JSON.stringify(results, null, 2)
  );
}

main().catch(console.error);
