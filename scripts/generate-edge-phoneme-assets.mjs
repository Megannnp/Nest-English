import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { RP_PHONEME_CATALOG } from "../client/src/phonetics/rpPhonemeCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client/public");
const PYTHONPATH = process.env.EDGE_TTS_PYTHONPATH || "/private/tmp/nest_edge_tts";
const voice = process.env.PHONEME_EDGE_VOICE || "en-GB-RyanNeural";
const rate = process.env.PHONEME_EDGE_RATE || "-10%";
const force = process.argv.includes("--force");

function runEdgeTts(text, dest) {
  execFileSync("python3", [
    "-m",
    "edge_tts",
    "--voice",
    voice,
    `--rate=${rate}`,
    "--text",
    text,
    "--write-media",
    dest,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PYTHONPATH },
  });
}

async function runEdgeTtsWithRetry(text, dest) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      runEdgeTts(text, dest);
      return;
    } catch (err) {
      lastError = err;
      if (fs.existsSync(dest) && fs.statSync(dest).size === 0) fs.unlinkSync(dest);
      if (attempt < 3) {
        process.stdout.write(`retry ${attempt} ... `);
        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
  throw lastError;
}

let generated = 0;
let skipped = 0;

for (const item of RP_PHONEME_CATALOG) {
  const dest = path.join(PUBLIC_DIR, item.file.replace(/^\//, ""));
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
    console.log(`skip ${path.basename(dest)} (${item.ipa})`);
    skipped += 1;
    continue;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  process.stdout.write(`make ${path.basename(dest)} (${item.ipa} -> ${item.text}) ... `);
  await runEdgeTtsWithRetry(item.text, dest);
  console.log("ok");
  generated += 1;
  await new Promise(resolve => setTimeout(resolve, 150));
}

console.log(`Done: ${generated} generated, ${skipped} skipped`);
