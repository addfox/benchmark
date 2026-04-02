/**
 * 批量测试脚本 - 对每个框架运行多次测试并计算平均值
 * 使用: node scripts/batch-benchmark.mjs [dev|build] [次数，默认10]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FRAMEWORKS = ['wxt', 'addfox', 'plasmo'];

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
      // 解析耗时结果
      const match = stdout.match(/(?:Dev 启动|Build 打包)耗时:\s*([\d.]+)s/);
      if (match && code === 0) {
        resolve({ success: true, time: parseFloat(match[1]) });
      } else {
        resolve({ success: false, output: stdout + stderr });
      }
    });
  });
}

async function runBenchmarks(type, count) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${type.toUpperCase()} 测试 - 每个框架 ${count} 次`);
  console.log('='.repeat(60));

  const results = {};
  
  for (const fw of FRAMEWORKS) {
    results[fw] = { times: [], failures: 0 };
    console.log(`\n[${fw}] 开始 ${count} 次测试...`);
    
    for (let i = 1; i <= count; i++) {
      process.stdout.write(`  第 ${i}/${count} 次... `);
      const result = await runTest(type, fw);
      
      if (result.success) {
        results[fw].times.push(result.time);
        console.log(`${result.time.toFixed(2)}s`);
      } else {
        results[fw].failures++;
        console.log(`❌ 失败`);
      }
      
      // 测试间隔，避免资源冲突
      if (i < count) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // 输出统计结果
  console.log(`\n${'='.repeat(60)}`);
  console.log('  测试结果汇总');
  console.log('='.repeat(60));
  console.log(`\n| 框架    | 测试次数 | 成功 | 失败 | 平均耗时 | 最小值 | 最大值 |`);
  console.log(`|---------|----------|------|------|----------|--------|--------|`);
  
  for (const fw of FRAMEWORKS) {
    const data = results[fw];
    const success = data.times.length;
    const failures = data.failures;
    
    if (success > 0) {
      const avg = data.times.reduce((a, b) => a + b, 0) / success;
      const min = Math.min(...data.times);
      const max = Math.max(...data.times);
      console.log(
        `| ${fw.padEnd(7)} | ${String(count).padStart(8)} | ${String(success).padStart(4)} | ${String(failures).padStart(4)} | ${avg.toFixed(2).padStart(8)}s | ${min.toFixed(2).padStart(6)}s | ${max.toFixed(2).padStart(6)}s |`
      );
    } else {
      console.log(`| ${fw.padEnd(7)} | ${String(count).padStart(8)} | ${String(0).padStart(4)} | ${String(failures).padStart(4)} | 全部失败 | - | - |`);
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
