/**
 * Downloads RP phoneme audio from Cambridge Dictionary.
 * These are professionally recorded British English (RP) phoneme sounds.
 *
 * Usage:
 *   node scripts/download-cambridge-phonemes.mjs
 */

import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../client/public/audio/phonemes");

fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = "https://dictionary.cambridge.org/media/english/uk_phonetic/uk_phonetics_sound_";

// output filename → Cambridge URL stem (appended with .mp3)
// "day" appears twice in Cambridge's chart so they use _001/_002 suffixes.
const PHONEMES = {
  // ── Monophthong vowels ──────────────────────────────────────────
  "ii.mp3":     "sheep_2023feb",        // /iː/
  "i.mp3":      "ship_2023feb",         // /ɪ/
  "aa.mp3":     "father_2023feb",       // /ɑː/
  "ae.mp3":     "hat_2023feb",          // /æ/
  "uh.mp3":     "cup_2023feb",          // /ʌ/
  "oo.mp3":     "horse_2023feb",        // /ɔː/
  "o.mp3":      "sock_2023feb",         // /ɒ/
  "uu.mp3":     "blue_2023feb",         // /uː/
  "u.mp3":      "foot_2023feb",         // /ʊ/
  "e.mp3":      "head_2023feb",         // /e/
  "er.mp3":     "bird_2023feb",         // /ɜː/
  "schwa.mp3":  "above_2023feb",        // /ə/

  // ── Diphthongs ──────────────────────────────────────────────────
  "ei.mp3":     "day_2023feb_002",       // /eɪ/ — verified against Cambridge phonetics.html: "eɪ" row uses _002, "d" row uses _001 (previously wrongly reused the /s/ row's "say_2023feb" clip)
  "ai.mp3":     "eye_2023feb",          // /aɪ/
  "oi.mp3":     "boy_2023feb",          // /ɔɪ/
  "ou.mp3":     "nose_2023feb",         // /əʊ/
  "au.mp3":     "mouth_2023feb",        // /aʊ/
  "ia.mp3":     "ear_2023feb",          // /ɪə/
  "ea.mp3":     "hair_2023feb",         // /eə/
  "ua.mp3":     "pure_2023feb",         // /ʊə/

  // ── Consonants ──────────────────────────────────────────────────
  "p.mp3":      "pen_2023feb",          // /p/
  "b.mp3":      "book_2023feb",         // /b/
  "t.mp3":      "town_2023feb",         // /t/
  "d.mp3":      "day_2023feb_001",      // /d/ — consonant section (verified against Cambridge phonetics.html: "d" row uses _001, "eɪ" row uses _002)
  "k.mp3":      "cat_2023feb",          // /k/
  "g.mp3":      "give_2023feb",         // /g/
  "f.mp3":      "fish_2023feb",         // /f/
  "v.mp3":      "very_2023feb",         // /v/
  "th.mp3":     "think_2023feb",        // /θ/
  "dh.mp3":     "this_2023feb",         // /ð/
  "s.mp3":      "say_2023feb",          // /s/
  "z.mp3":      "zoo_2023feb",          // /z/
  "sh.mp3":     "she_2023feb",          // /ʃ/
  "zh.mp3":     "vision_2023feb",       // /ʒ/
  "ch.mp3":     "cheese_2023feb",       // /tʃ/
  "j.mp3":      "jump_2023feb",         // /dʒ/
  "m.mp3":      "moon_2023feb",         // /m/
  "n.mp3":      "name_2023feb",         // /n/
  "ng.mp3":     "sing_2023feb",         // /ŋ/
  "l.mp3":      "look_2023feb",         // /l/
  "r.mp3":      "run_2023feb",          // /r/
  "w.mp3":      "we_2023feb",           // /w/
  "y.mp3":      "yes_2023feb",          // /j/
  "h.mp3":      "hand_2023feb",         // /h/
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://dictionary.cambridge.org/help/phonetics.html",
  "Accept": "audio/mpeg,audio/*",
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: HEADERS,
    };
    https.get(options, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", err => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

let ok = 0, fail = 0;

for (const [file, stem] of Object.entries(PHONEMES)) {
  const dest = path.join(OUT_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`  skip  ${file}`);
    ok++;
    continue;
  }
  const url = `${BASE}${stem}.mp3`;
  process.stdout.write(`  dl    ${file} (${stem}) ... `);
  try {
    await download(url, dest);
    console.log("ok");
    ok++;
    await new Promise(r => setTimeout(r, 600));
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    fail++;
    await new Promise(r => setTimeout(r, 1500));
  }
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
