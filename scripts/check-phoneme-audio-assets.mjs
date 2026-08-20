import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { RP_PHONEME_CATALOG } from "../client/src/phonetics/rpPhonemeCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "../client/public");

const errors = [];
const seenKeys = new Set();
const seenFiles = new Set();

for (const item of RP_PHONEME_CATALOG) {
  if (!item.ipa || !item.key || !item.file || !item.source || !item.text) {
    errors.push(`Incomplete catalog item: ${JSON.stringify(item)}`);
    continue;
  }

  if (seenKeys.has(item.key)) errors.push(`Duplicate phoneme key: ${item.key}`);
  seenKeys.add(item.key);

  if (!item.file.startsWith("/audio/phonemes/")) {
    errors.push(`${item.ipa} file must live under /audio/phonemes/: ${item.file}`);
  }

  if (!item.file.endsWith(".mp3")) {
    errors.push(`${item.ipa} must reference mp3, not ${item.file}`);
  }

  if (item.file.includes(".ogg")) {
    errors.push(`${item.ipa} must not reference ogg: ${item.file}`);
  }

  if (!item.cluster && item.file.includes("/audio/phonemes/ai/")) {
    errors.push(`${item.ipa} non-cluster phoneme must use recorded root audio, not ${item.file}`);
  }

  if (item.cluster && item.file.includes("/audio/phonemes/ai/")) {
    const recordedCandidate = `/audio/phonemes/${path.basename(item.file)}`;
    const recordedAbs = path.join(PUBLIC_DIR, recordedCandidate.replace(/^\//, ""));
    if (fs.existsSync(recordedAbs)) {
      errors.push(`${item.ipa} recorded cluster audio exists but catalog still points to fallback: ${item.file}`);
    }
  }

  seenFiles.add(item.file);

  const abs = path.join(PUBLIC_DIR, item.file.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    errors.push(`${item.ipa} missing audio file: ${item.file}`);
    continue;
  }

  const stat = fs.statSync(abs);
  if (!stat.isFile() || stat.size < 1024) {
    errors.push(`${item.ipa} audio file is empty or too small: ${item.file}`);
  }
}

const expectedCount = 48;
if (RP_PHONEME_CATALOG.length !== expectedCount) {
  errors.push(`Expected ${expectedCount} phoneme assets, got ${RP_PHONEME_CATALOG.length}`);
}

if (seenFiles.size !== RP_PHONEME_CATALOG.length) {
  errors.push("Every phoneme catalog row should map to one unique audio file");
}

if (errors.length) {
  console.error("Phoneme audio asset check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Phoneme audio asset check passed: ${RP_PHONEME_CATALOG.length} mp3 files`);
