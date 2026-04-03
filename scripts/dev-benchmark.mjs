/**
 * Dev 启动耗时测试脚本
 * 使用: node scripts/dev-benchmark.mjs [wxt|addfox|plasmo|extensionjs]
 * 
 * 结束匹配规则:
 * - wxt: 输出包含 "Opened browser in"
 * - addfox: 输出包含 "extensions loaded"
 * - plasmo: 输出包含 "Extension re-packaged"
 * - extensionjs: 输出包含 "compiled successfully"
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
    devCommand: "pnpm run dev",
    readyPattern: /Opened browser in/i,
  },
  addfox: {
    name: "addfox",
    cwd: join(ROOT, "addfox"),
    devCommand: "pnpm run dev",
    readyPattern: /extensions loaded/i,
  },
  plasmo: {
    name: "plasmo",
    cwd: join(ROOT, "plasmo"),
    devCommand: "pnpm run dev",
    readyPattern: /Extension re-packaged/i,
  },
  extensionjs: {
    name: "extensionjs",
    cwd: join(ROOT, "extensionjs"),
    devCommand: "pnpm run dev",
    readyPattern: /compiled successfully|Edge Add-on ready/i,
  },
};

function runDevUntilReady(fw) {
  return new Promise((resolve) => {
    if (!existsSync(fw.cwd)) {
      console.error(`❌ 目录不存在: ${fw.cwd}`);
      process.exit(1);
    }

    const [exe, ...args] = fw.devCommand.split(/\s+/);
    const startTime = Date.now();
    
    console.log(`\n[${fw.name}] 启动 dev 服务器...`);
    console.log(`  命令: ${fw.devCommand}`);
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
        
        process.stdout.write(`\r  ✅ Dev 就绪! 总耗时: ${totalSec}s      \n`);
        console.log(`\n  匹配到的输出片段:`);
        // 显示匹配行前后的一些上下文
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
      onData(data); // 某些框架的输出在 stderr
    });

    proc.on("close", (code) => {
      clearInterval(timer);
      if (!isReady) {
        process.stdout.write(`\r  ❌ 进程退出 (code: ${code})               \n`);
        resolve({ success: false, ms: -1, code });
      }
    });

    // 超时处理: 2分钟
    setTimeout(() => {
      if (!isReady) {
        clearInterval(timer);
        const totalMs = Date.now() - startTime;
        process.stdout.write(`\r  ⚠️  超时! 已耗时: ${(totalMs / 1000).toFixed(2)}s\n`);
        try { proc.kill("SIGTERM"); } catch (_) {}
        resolve({ success: false, ms: totalMs, timeout: true });
      }
    }, 120000);
  });
}

async function main() {
  const framework = process.argv[2]?.toLowerCase();

  if (!framework || !FRAMEWORKS[framework]) {
    console.log("Usage: node scripts/dev-benchmark.mjs [wxt|addfox|plasmo|extensionjs]");
    console.log("\n测试各框架的 dev 启动耗时:");
    console.log("  wxt         - 匹配 'Opened browser in'");
    console.log("  addfox      - 匹配 'extensions loaded'");
    console.log("  plasmo      - 匹配 'Extension re-packaged'");
    console.log("  extensionjs - 匹配 'compiled successfully'");
    process.exit(1);
  }

  const fw = FRAMEWORKS[framework];
  const result = await runDevUntilReady(fw);

  if (result.success) {
    console.log(`\n📊 ${fw.name} Dev 启动耗时: ${(result.ms / 1000).toFixed(2)}s`);
    process.exit(0);
  } else {
    console.log(`\n❌ ${fw.name} Dev 启动失败或超时`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
