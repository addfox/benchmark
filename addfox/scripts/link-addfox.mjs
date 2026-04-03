#!/usr/bin/env node
/**
 * Link addfox packages in benchmark project
 * Run this from benchmark/addfox after setup:benchmark
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const addfoxRoot = resolve(process.cwd(), '..', '..', 'addfox');
const packagesDir = resolve(addfoxRoot, 'packages');
const pluginsDir = resolve(packagesDir, 'plugins');

// Map of package names to their paths
const packagePaths = {
  'addfox': resolve(packagesDir, 'addfox'),
  '@addfox/utils': resolve(packagesDir, 'utils'),
  '@addfox/core': resolve(packagesDir, 'core'),
  '@addfox/common': resolve(packagesDir, 'common'),
  '@addfox/cli': resolve(packagesDir, 'cli'),
  '@addfox/rsbuild-plugin-extension-entry': resolve(pluginsDir, 'rsbuild-plugin-extension-entry'),
  '@addfox/rsbuild-plugin-extension-hmr': resolve(pluginsDir, 'rsbuild-plugin-extension-hmr'),
  '@addfox/rsbuild-plugin-extension-manifest': resolve(pluginsDir, 'rsbuild-plugin-extension-manifest'),
  '@addfox/rsbuild-plugin-extension-monitor': resolve(pluginsDir, 'rsbuild-plugin-extension-monitor'),
  '@addfox/rsbuild-plugin-vue': resolve(pluginsDir, 'rsbuild-plugin-vue'),
};

console.log('🔗 Linking addfox packages...\n');

for (const [pkgName, pkgPath] of Object.entries(packagePaths)) {
  if (existsSync(pkgPath)) {
    try {
      // Use pnpm link <directory> to link directly from source
      execSync(`pnpm link "${pkgPath}"`, {
        stdio: 'pipe',
      });
      console.log(`✅ Linked ${pkgName}`);
    } catch (e) {
      console.error(`❌ Failed to link ${pkgName}:`, e.message);
    }
  } else {
    console.warn(`⚠️  Package not found: ${pkgPath}`);
  }
}

console.log('\n📋 Verifying links...');
try {
  execSync('pnpm list addfox @addfox/utils @addfox/core @addfox/common --depth=0', {
    stdio: 'inherit',
  });
} catch (e) {
  // Ignore exit code
}

console.log('\n✅ Done! Run `pnpm install` if needed.');
