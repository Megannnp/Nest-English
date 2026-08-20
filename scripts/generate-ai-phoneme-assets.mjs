import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { RP_PHONEME_CATALOG } from "../client/src/phonetics/rpPhonemeCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "client/public");
const TTS_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const rawValue = trimmed.slice(idx + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, "server/.env.local"));
loadEnvFile(path.join(ROOT, "server/.env"));

function clampSpeed(rate) {
  const n = Number(rate) || 0.78;
  return Math.min(Math.max(n, 0.5), 2.0);
}

async function synthesize(text, speed) {
  const apiKey = process.env.VOLCENGINE_TTS_TOKEN;
  const appId = process.env.VOLCENGINE_TTS_APPID || "";
  const cluster = process.env.VOLCENGINE_TTS_CLUSTER || "volcano_tts";
  const voice = process.env.VOLCENGINE_TTS_VOICE || "BV406_streaming";

  if (!apiKey) throw new Error("Missing VOLCENGINE_TTS_TOKEN");
  if (!appId) throw new Error("Missing VOLCENGINE_TTS_APPID");

  const payload = {
    app: { appid: appId, token: apiKey, cluster },
    user: { uid: "nest_ai_phoneme_assets" },
    audio: {
      voice_type: voice,
      encoding: "mp3",
      speed_ratio: clampSpeed(speed),
      volume_ratio: 1.0,
      pitch_ratio: 1.0,
    },
    request: {
      reqid: crypto.randomUUID(),
      text,
      text_type: "plain",
      operation: "query",
    },
  };

  const res = await fetch(TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer;${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Volcengine TTS HTTP ${res.status}: ${body}`);
  }

  const json = await res.json();
  if (json.code !== 3000 || !json.data?.audio) {
    throw new Error(`Volcengine TTS error ${json.code}: ${json.message || "missing audio"}`);
  }

  return Buffer.from(json.data.audio, "base64");
}

const force = process.argv.includes("--force");
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
  const audio = await synthesize(item.text, 0.78);
  fs.writeFileSync(dest, audio);
  console.log("ok");
  generated += 1;
  await new Promise(resolve => setTimeout(resolve, 250));
}

console.log(`Done: ${generated} generated, ${skipped} skipped`);
