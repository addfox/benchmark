/**
 * Build 打包耗时测试脚本
 * 使用: node scripts/build-benchmark.mjs [wxt|addfox|plasmo|extensionjs]
 * 
 * 结束匹配规则:
 * - addfox: 输出包含 "Extension size"
 * - wxt: 输出包含 "Finished in"
 * - plasmo: 输出包含 "Finished in"
 * - extensionjs: 输出包含 "Build completed in"
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
  },
  addfox: {
    name: "addfox",
    cwd: join(ROOT, "addfox"),
    buildCommand: "pnpm run build",
    readyPattern: /Extension size/i,
  },
  plasmo: {
    name: "plasmo",
    cwd: join(ROOT, "plasmo"),
    buildCommand: "pnpm run build",
    readyPattern: /Finished in/i,
  },
  extensionjs: {
    name: "extensionjs",
    cwd: join(ROOT, "extensionjs"),
    buildCommand: "pnpm run build",
    readyPattern: /Build completed in/i,
  },
};

function runBuildUntilReady(fw) {
  return new Promise((resolve) => {
    if (!existsSync(fw.cwd)) {
      console.error(`❌ 目录不存在: ${fw.cwd}`);
      process.exit(1);
    }

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

    // 实时显示耗时
    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const seconds = (elapsed / 1000).toFixed(1);
      process.stdout.write(`\r  ⏱️  已耗时: ${seconds}s `);
    };

    timer = setInterval(updateTimer, 100);

    const onData = (data) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // 检查是否匹配完成标志
      if (!isReady && fw.readyPattern.test(chunk)) {
        isReady = true;
        clearInterval(timer);
        const totalMs = Date.now() - startTime;
        const totalSec = (totalMs / 1000).toFixed(2);
        
        process.stdout.write(`\r  ✅ Build 完成! 总耗时: ${totalSec}s      \n`);
        console.log(`\n  匹配到的输出片段:`);
        // 显示匹配行
        const lines = stdout.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (fw.readyPattern.test(lines[i])) {
            console.log(`    > ${lines[i].trim()}`);
            break;
          }
        }
        
        proc.kill("SIGTERM");
        resolve({ success: true, ms: totalMs });
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
        // 进程正常退出且返回码为0，也视为成功
        if (code === 0) {
          const totalMs = Date.now() - startTime;
          process.stdout.write(`\r  ✅ Build 完成! 总耗时: ${(totalMs / 1000).toFixed(2)}s      \n`);
          resolve({ success: true, ms: totalMs });
        } else {
          process.stdout.write(`\r  ❌ 进程退出 (code: ${code})               \n`);
          resolve({ success: false, ms: -1, code });
        }
      }
    });

    // 超时处理: 5分钟 (build 可能比 dev 久)
    setTimeout(() => {
      if (!isReady) {
        clearInterval(timer);
        const totalMs = Date.now() - startTime;
        process.stdout.write(`\r  ⚠️  超时! 已耗时: ${(totalMs / 1000).toFixed(2)}s\n`);
        try { proc.kill("SIGTERM"); } catch (_) {}
        resolve({ success: false, ms: totalMs, timeout: true });
      }
    }, 300000);
  });
}

async function main() {
  const framework = process.argv[2]?.toLowerCase();

  if (!framework || !FRAMEWORKS[framework]) {
    console.log("Usage: node scripts/build-benchmark.mjs [wxt|addfox|plasmo|extensionjs]");
    console.log("\n测试各框架的 build 打包耗时:");
    console.log("  wxt         - 匹配 'Finished in'");
    console.log("  addfox      - 匹配 'Extension size'");
    console.log("  plasmo      - 匹配 'Finished in'");
    console.log("  extensionjs - 匹配 'Build completed in'");
    process.exit(1);
  }

  const fw = FRAMEWORKS[framework];
  const result = await runBuildUntilReady(fw);

  if (result.success) {
    console.log(`\n📊 ${fw.name} Build 打包耗时: ${(result.ms / 1000).toFixed(2)}s`);
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
