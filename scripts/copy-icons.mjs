import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "..", "..", "VideoRoll-Pro", "public", "icons");
const sharedDest = join(root, "shared", "icons");
const packages = ["addfox", "plasmo", "extensionjs", "parcel-extension"];

if (!existsSync(src)) {
  console.warn("VideoRoll-Pro/public/icons not found; copy icon_*.png to each package's public/icons manually.");
  process.exit(0);
}
mkdirSync(sharedDest, { recursive: true });
cpSync(src, sharedDest, { recursive: true });
for (const pkg of packages) {
  const dest = join(root, pkg, "public", "icons");
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}
console.log("Icons copied to shared/icons and all package public/icons");
