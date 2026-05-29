/**
 * Build 打包耗时测试脚本（改进版）
 * 同时测量：总时间（Total）和 纯构建时间（Pure Build）
 * 并在 build 前清理输出目录，确保测量准确
 * 
 * 使用: node scripts/build-benchmark.mjs [wxt|addfox|plasmo|extensionjs]
 */
import { spawn, exec } from "node:child_process";
import { existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const FRAMEWORKS = {
  wxt: {
    name: "wxt",
    cwd: join(ROOT, "wxt"),
    buildCommand: "pnpm run build",
    readyPattern: /Finished in/i,
    pureBuildPattern: /(?:Built extension in|Finished in)\s+(\d+(?:\.\d+)?)\s*(?:ms|s)/i,
    outputDir: join(ROOT, "wxt", ".output", "chrome-mv3"),
  },
  addfox: {
    name: "addfox",
    cwd: join(ROOT, "addfox"),
    buildCommand: "pnpm run build",
    readyPattern: /Extension size/i,
    pureBuildPattern: /Rsbuild build\s+(\d+(?:\.\d+)?)\s*ms/i,
    outputDir: join(ROOT, "addfox", ".addfox", "extension", "extension-chromium"),
  },
  plasmo: {
    name: "plasmo",
    cwd: join(ROOT, "plasmo"),
    buildCommand: "pnpm run build",
    readyPattern: /Finished in/i,
    pureBuildPattern: /Finished in\s+(\d+(?:\.\d+)?)\s*ms/i,
    outputDir: join(ROOT, "plasmo", "build", "chrome-mv3-prod"),
  },
  extensionjs: {
    name: "extensionjs",
    cwd: join(ROOT, "extensionjs"),
    buildCommand: "pnpm run build",
    readyPattern: /Build completed in/i,
    pureBuildPattern: null, // Extension.js 自报时间不准（显示 0.00s）
    outputDir: join(ROOT, "extensionjs", "dist", "chromium"),
  },
};

function cleanDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`  🧹 清理输出目录: ${dir}`);
  }
}

function getDirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) total += getDirSize(p);
      else total += statSync(p).size;
    }
  } catch (_) {}
  return total;
}

function runBuild(fw) {
  return new Promise((resolve) => {
    if (!existsSync(fw.cwd)) {
      console.error(`❌ 目录不存在: ${fw.cwd}`);
      process.exit(1);
    }

    // 1. 清理输出目录
    cleanDir(fw.outputDir);

    const [exe, ...args] = fw.buildCommand.split(/\s+/);
    const startTime = Date.now();
    
    console.log(`\n[${fw.name}] 开始打包...`);
    console.log(`  命令: ${fw.buildCommand}`);
    console.log(`  目录: ${fw.cwd}`);
    console.log(`  结束匹配: ${fw.readyPattern}\n`);

    const proc = spawn(exe, args, {
      cwd: fw.cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timer = null;
    let isReady = false;

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const seconds = (elapsed / 1000).toFixed(1);
      process.stdout.write(`\r  ⏱️  已耗时: ${seconds}s `);
    };

    timer = setInterval(updateTimer, 100);

    const onData = (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      if (!isReady && fw.readyPattern.test(chunk)) {
        isReady = true;
        clearInterval(timer);
        const totalMs = Date.now() - startTime;
        const totalSec = (totalMs / 1000).toFixed(2);
        
        // 解析框架自报的纯构建时间（先剥离 ANSI 颜色代码）
        let pureBuildMs = null;
        if (fw.pureBuildPattern) {
          const cleanStdout = stdout.replace(/\x1B\[[0-9;]*m/g, '');
          const pureMatch = cleanStdout.match(fw.pureBuildPattern);
          if (pureMatch) {
            const val = parseFloat(pureMatch[1]);
            // 检测单位: 如果匹配字符串里有 'ms' 就是毫秒，否则按秒处理
            const matchStr = pureMatch[0];
            pureBuildMs = /\d+\s*ms/i.test(matchStr) ? val : val * 1000;
          }
        }
        
        // 计算产物大小
        const sizeBytes = getDirSize(fw.outputDir);
        
        process.stdout.write(`\r  ✅ Build 完成! 总耗时: ${totalSec}s      \n`);
        if (pureBuildMs !== null) {
          console.log(`     框架自报构建时间: ${pureBuildMs.toFixed(0)}ms`);
        }
        console.log(`     产物大小: ${(sizeBytes / 1024).toFixed(1)} KB`);
        console.log(`\n  匹配到的输出片段:`);
        const lines = stdout.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (fw.readyPattern.test(lines[i])) {
            console.log(`    > ${lines[i].trim()}`);
            break;
          }
        }
        
        proc.kill("SIGTERM");
        resolve({ success: true, totalMs, pureBuildMs, sizeBytes });
      }
    };

    proc.stdout?.on("data", onData);
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
      onData(data);
    });

    proc.on("close", (code) => {
      clearInterval(timer);
      if (!isReady) {
        if (code === 0) {
          const totalMs = Date.now() - startTime;
          const sizeBytes = getDirSize(fw.outputDir);
          process.stdout.write(`\r  ✅ Build 完成! 总耗时: ${(totalMs / 1000).toFixed(2)}s      \n`);
          resolve({ success: true, totalMs, pureBuildMs: null, sizeBytes });
        } else {
          process.stdout.write(`\r  ❌ 进程退出 (code: ${code})               \n`);
          resolve({ success: false, totalMs: -1, pureBuildMs: null, sizeBytes: 0 });
        }
      }
    });

    setTimeout(() => {
      if (!isReady) {
        clearInterval(timer);
        const totalMs = Date.now() - startTime;
        process.stdout.write(`\r  ⚠️  超时! 已耗时: ${(totalMs / 1000).toFixed(2)}s\n`);
        try { proc.kill("SIGTERM"); } catch (_) {}
        resolve({ success: false, totalMs, pureBuildMs: null, sizeBytes: 0, timeout: true });
      }
    }, 300000);
  });
}

async function main() {
  const framework = process.argv[2]?.toLowerCase();

  if (!framework || !FRAMEWORKS[framework]) {
    console.log("Usage: node scripts/build-benchmark.mjs [wxt|addfox|plasmo|extensionjs]");
    console.log("\n测试各框架的 build 打包耗时（改进版）:");
    console.log("  同时测量: 总耗时 + 框架自报纯构建时间 + 产物大小");
    console.log("  wxt         - 匹配 'Finished in' / 纯构建 'Built extension in'");
    console.log("  addfox      - 匹配 'Extension size' / 纯构建 'Rsbuild build'");
    console.log("  plasmo      - 匹配 'Finished in' / 纯构建 'Finished in'");
    console.log("  extensionjs - 匹配 'Build completed in'");
    process.exit(1);
  }

  const fw = FRAMEWORKS[framework];
  const result = await runBuild(fw);

  if (result.success) {
    console.log(`\n📊 ${fw.name} Build 结果:`);
    console.log(`   总耗时: ${(result.totalMs / 1000).toFixed(2)}s`);
    if (result.pureBuildMs !== null) {
      console.log(`   纯构建: ${(result.pureBuildMs / 1000).toFixed(2)}s`);
    }
    console.log(`   产物大小: ${(result.sizeBytes / 1024).toFixed(1)} KB`);
    // 输出机器可解析的 JSON 行，供 run-benchmark-suite.mjs 提取
    console.log(`__BENCHMARK_RESULT__${JSON.stringify({
      name: fw.name,
      totalSec: parseFloat((result.totalMs / 1000).toFixed(2)),
      pureBuildSec: result.pureBuildMs !== null ? parseFloat((result.pureBuildMs / 1000).toFixed(2)) : null,
      sizeKb: parseFloat((result.sizeBytes / 1024).toFixed(1)),
    })}`);
    process.exit(0);
  } else {
    console.log(`\n❌ ${fw.name} Build 打包失败或超时`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
