import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { RP_PHONEME_CATALOG } from "../client/src/phonetics/rpPhonemeCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.join(__dirname, "..");
const OUT_ROOT = path.join(WORKSPACE_ROOT, "client/public");

const sourceDir = process.argv[2];

if (!sourceDir) {
  console.error("Usage: npm run phonemes:import -- /absolute/or/relative/source-dir");
  process.exit(1);
}

const absSourceDir = path.resolve(WORKSPACE_ROOT, sourceDir);
if (!fs.existsSync(absSourceDir) || !fs.statSync(absSourceDir).isDirectory()) {
  console.error(`Source directory does not exist: ${absSourceDir}`);
  process.exit(1);
}

const targets = RP_PHONEME_CATALOG;

let copied = 0;
const missing = [];

for (const item of targets) {
  const filename = path.basename(item.file);
  const src = path.join(absSourceDir, filename);
  const dest = path.join(OUT_ROOT, item.file.replace(/^\//, ""));

  if (!fs.existsSync(src)) {
    missing.push(`${item.ipa} -> ${filename}`);
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied += 1;
  console.log(`copied ${filename}`);
}

if (missing.length) {
  console.error("\nMissing source recordings:");
  for (const row of missing) console.error(`- ${row}`);
  process.exit(1);
}

console.log(`Done: ${copied} RP phoneme recordings imported`);
