import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { RP_PHONEME_CATALOG } from "../client/src/phonetics/rpPhonemeCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client/public");

const voice = process.env.PHONEME_LOCAL_VOICE || "Daniel";
const rate = process.env.PHONEME_LOCAL_RATE || "145";
const force = process.argv.includes("--force");

function run(command, args) {
  execFileSync(command, args, { stdio: ["ignore", "pipe", "pipe"] });
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
  const tmpAiff = path.join(os.tmpdir(), `nest-phoneme-${item.key.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.aiff`);
  process.stdout.write(`make ${path.basename(dest)} (${item.ipa} -> ${item.text}) ... `);

  try {
    run("say", ["-v", voice, "-r", rate, "-o", tmpAiff, item.text]);
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", tmpAiff, "-codec:a", "libmp3lame", "-b:a", "128k", dest]);
    console.log("ok");
    generated += 1;
  } finally {
    if (fs.existsSync(tmpAiff)) fs.unlinkSync(tmpAiff);
  }
}

console.log(`Done: ${generated} generated, ${skipped} skipped`);
