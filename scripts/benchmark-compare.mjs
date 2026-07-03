#!/usr/bin/env node
/**
 * Benchmark 结果对比工具
 *
 * 用法:
 *   node scripts/benchmark-compare.mjs snapshot
 *       把当前的 benchmark-build-final.json / benchmark-dev-final.json
 *       保存为对比基线 (baseline/build.json / baseline/dev.json)。
 *       在“重新跑一轮之前”执行，用来记录“上一轮”的数据。
 *
 *   node scripts/benchmark-compare.mjs
 *       用当前 final 结果对比 baseline，打印每个框架（重点是 addfox）
 *       在 build 总耗时 / 纯构建 / 体积 与 dev 启动耗时上的变化。
 *
 * 说明: dev 若某框架为 null（未能测出，见 SKILL.md 已知问题），会显示 N/A 而不报错。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BASELINE_DIR = join(ROOT, "baseline");

const FILES = {
  build: { final: join(ROOT, "benchmark-build-final.json"), baseline: join(BASELINE_DIR, "build.json") },
  dev: { final: join(ROOT, "benchmark-dev-final.json"), baseline: join(BASELINE_DIR, "dev.json") },
};

const FRAMEWORKS = ["addfox", "wxt", "extensionjs", "plasmo"];

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function snapshot() {
  mkdirSync(BASELINE_DIR, { recursive: true });
  let n = 0;
  for (const type of ["build", "dev"]) {
    const { final, baseline } = FILES[type];
    if (existsSync(final)) {
      copyFileSync(final, baseline);
      console.log(`✓ baseline 已保存: ${baseline}`);
      n++;
    } else {
      console.log(`⚠ 跳过 ${type}: 找不到 ${final}`);
    }
  }
  if (n === 0) {
    console.log("没有可保存的 final 结果，请先跑一轮 benchmark。");
    process.exit(1);
  }
}

/** 格式化 “基线 -> 当前 (+/-%)”，任一侧缺失显示 N/A。 */
function fmtDelta(base, cur, unit = "s", digits = 2) {
  const b = typeof base === "number" ? base : null;
  const c = typeof cur === "number" ? cur : null;
  const bs = b === null ? "N/A" : b.toFixed(digits) + unit;
  const cs = c === null ? "N/A" : c.toFixed(digits) + unit;
  if (b === null || c === null) return `${bs} -> ${cs}`;
  const pct = ((c - b) / b) * 100;
  const sign = pct > 0 ? "+" : "";
  const tag = pct < -0.05 ? "更快" : pct > 0.05 ? "更慢" : "持平";
  return `${bs} -> ${cs} (${sign}${pct.toFixed(1)}% ${tag})`;
}

function compare() {
  const build = { base: readJson(FILES.build.baseline), cur: readJson(FILES.build.final) };
  const dev = { base: readJson(FILES.dev.baseline), cur: readJson(FILES.dev.final) };

  if (!build.base && !dev.base) {
    console.log("找不到 baseline，请先执行: node scripts/benchmark-compare.mjs snapshot");
    process.exit(1);
  }

  const line = "=".repeat(78);

  console.log(`\n${line}\nBUILD 对比 (baseline -> 当前)\n${line}`);
  console.log("框架         | 总耗时                          | 纯构建                          | 体积");
  console.log("-".repeat(78));
  for (const fw of FRAMEWORKS) {
    const b = build.base?.[fw];
    const c = build.cur?.[fw];
    console.log(
      `${fw.padEnd(12)} | ${fmtDelta(b?.avg, c?.avg).padEnd(30)} | ` +
      `${fmtDelta(b?.avgPure, c?.avgPure).padEnd(30)} | ${fmtDelta(b?.avgSize, c?.avgSize, "KB", 0)}`
    );
  }

  console.log(`\n${line}\nDEV 启动对比 (baseline -> 当前)\n${line}`);
  console.log("框架         | 平均启动耗时");
  console.log("-".repeat(78));
  for (const fw of FRAMEWORKS) {
    const b = dev.base?.[fw];
    const c = dev.cur?.[fw];
    console.log(`${fw.padEnd(12)} | ${fmtDelta(b?.avg, c?.avg)}`);
  }

  // addfox 单独高亮结论
  console.log(`\n${line}\naddfox 结论\n${line}`);
  const ab = build.base?.addfox, ac = build.cur?.addfox;
  const dbb = dev.base?.addfox, dc = dev.cur?.addfox;
  console.log(`  build 总耗时: ${fmtDelta(ab?.avg, ac?.avg)}`);
  console.log(`  build 纯构建: ${fmtDelta(ab?.avgPure, ac?.avgPure)}`);
  console.log(`  build 体积  : ${fmtDelta(ab?.avgSize, ac?.avgSize, "KB", 0)}`);
  console.log(`  dev 启动    : ${fmtDelta(dbb?.avg, dc?.avg)}`);
  if (dc == null) {
    console.log(`  注意: 本轮 addfox dev 未测出（见 SKILL.md「已知问题：addfox dev 启动」）。`);
  }
  console.log("");
}

const mode = process.argv[2];
if (mode === "snapshot") {
  snapshot();
} else if (!mode || mode === "compare") {
  compare();
} else {
  console.log("用法: node scripts/benchmark-compare.mjs [snapshot|compare]");
  process.exit(1);
}
