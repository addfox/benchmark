/**
 * 批量测试脚本 - 对每个框架运行多次测试并计算平均值
 * 使用: node scripts/batch-benchmark.mjs [dev|build] [次数，默认10]
 */
import { spawn, exec } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FRAMEWORKS = ['wxt', 'addfox', 'plasmo'];

function parseResult(stdout, type) {
  // build-benchmark.mjs 改进版会打印机器可读的 JSON 行：
  // __BENCHMARK_RESULT__{"name":"...","totalSec":1.74,"pureBuildSec":0.71,"sizeKb":837}
  const jsonMatch = stdout.match(/__BENCHMARK_RESULT__({.+})/);
  if (jsonMatch) {
    try {
      const r = JSON.parse(jsonMatch[1]);
      return { success: true, time: r.totalSec, pureBuildSec: r.pureBuildSec ?? null, sizeKb: r.sizeKb ?? null };
    } catch {}
  }
  // 兼容老版人类可读输出
  const legacyMatch = stdout.match(/(?:Dev 启动|Build 打包)耗时:\s*([\d.]+)s/);
  if (legacyMatch) {
    return { success: true, time: parseFloat(legacyMatch[1]), pureBuildSec: null, sizeKb: null };
  }
  return { success: false };
}

function runTest(type, framework) {
  return new Promise((resolve) => {
    const script = type === 'dev' ? 'dev-benchmark.mjs' : 'build-benchmark.mjs';
    const proc = spawn('node', [join(__dirname, script), framework], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      // 解析耗时结果（优先 JSON，退到老式字符串）
      const parsed = parseResult(stdout, type);
      if (parsed.success && code === 0) {
        resolve(parsed);
      } else {
        resolve({ success: false, output: stdout + stderr });
      }
    });
  });
}

function killBrowsers() {
  return new Promise((resolve) => {
    exec('taskkill /F /IM chrome.exe 2>nul', () => {
      exec('taskkill /F /IM msedge.exe 2>nul', () => resolve());
    });
    setTimeout(resolve, 1000);
  });
}

function freePorts() {
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
            if (pid && /^\d+$/.test(pid)) pids.add(pid);
          }
          let killed = 0;
          if (pids.size === 0) {
            completed++;
            if (completed === ports.length) resolve();
          }
          for (const pid of pids) {
            exec(`taskkill /F /PID ${pid} 2>nul`, () => {
              killed++;
              if (killed === pids.size) {
                completed++;
                if (completed === ports.length) resolve();
              }
            });
          }
        } else {
          completed++;
          if (completed === ports.length) resolve();
        }
      });
    }
    setTimeout(resolve, 2000);
  });
}

async function runBenchmarks(type, count) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${type.toUpperCase()} 测试 - 每个框架 ${count} 次`);
  console.log('='.repeat(60));

  const results = {};
  
  for (const fw of FRAMEWORKS) {
    results[fw] = { times: [], pureBuildSec: [], sizeKb: [], failures: 0 };
    console.log(`\n[${fw}] 开始 ${count} 次测试...`);
    
    for (let i = 1; i <= count; i++) {
      process.stdout.write(`  第 ${i}/${count} 次... `);
      const result = await runTest(type, fw);
      
      if (result.success) {
        results[fw].times.push(result.time);
        if (result.pureBuildSec !== null) results[fw].pureBuildSec.push(result.pureBuildSec);
        if (result.sizeKb !== null) results[fw].sizeKb.push(result.sizeKb);
        let suffix = '';
        if (result.pureBuildSec !== null) suffix += ` | pure ${result.pureBuildSec.toFixed(2)}s`;
        if (result.sizeKb !== null) suffix += ` | ${result.sizeKb.toFixed(0)}KB`;
        console.log(`${result.time.toFixed(2)}s${suffix}`);
      } else {
        results[fw].failures++;
        console.log(`❌ 失败`);
      }
      
      // 测试间隔，关闭本次浏览器并避免资源冲突
      if (i < count) {
        if (type === 'dev') await killBrowsers();
        await freePorts();
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // 输出统计结果
  console.log(`\n${'='.repeat(70)}`);
  console.log('  测试结果汇总');
  console.log('='.repeat(70));
  const isBuild = type === 'build';
  console.log(`\n| 框架    | 测试次数 | 成功 | 失败 | 平均耗时 | 最小值 | 最大值 | 纯构建   | 体积   |`);
  console.log(`|---------|----------|------|------|----------|--------|--------|----------|--------|`);
  
  for (const fw of FRAMEWORKS) {
    const data = results[fw];
    const success = data.times.length;
    const failures = data.failures;
    
    if (success > 0) {
      const avg = data.times.reduce((a, b) => a + b, 0) / success;
      const min = Math.min(...data.times);
      const max = Math.max(...data.times);
      const avgPure = data.pureBuildSec.length > 0
        ? (data.pureBuildSec.reduce((a, b) => a + b, 0) / data.pureBuildSec.length).toFixed(2) + 's'
        : '-';
      const avgSize = data.sizeKb.length > 0
        ? (data.sizeKb.reduce((a, b) => a + b, 0) / data.sizeKb.length).toFixed(0) + 'KB'
        : '-';
      console.log(
        `| ${fw.padEnd(7)} | ${String(count).padStart(8)} | ${String(success).padStart(4)} | ${String(failures).padStart(4)} | ${avg.toFixed(2).padStart(8)}s | ${min.toFixed(2).padStart(6)}s | ${max.toFixed(2).padStart(6)}s | ${avgPure.padStart(8)} | ${avgSize.padStart(6)} |`
      );
    } else {
      console.log(`| ${fw.padEnd(7)} | ${String(count).padStart(8)} | ${String(0).padStart(4)} | ${String(failures).padStart(4)} | 全部失败 | - | - | - | - |`);
    }
  }

  console.log('');
  return results;
}

async function main() {
  const type = process.argv[2] || 'dev';
  const count = parseInt(process.argv[3]) || 10;

  if (!['dev', 'build'].includes(type)) {
    console.log('Usage: node scripts/batch-benchmark.mjs [dev|build] [次数，默认10]');
    process.exit(1);
  }

  const startTime = Date.now();
  await runBenchmarks(type, count);
  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1);
  
  console.log(`\n✅ 全部测试完成，总耗时: ${totalMin} 分钟`);
}

main().catch(console.error);
