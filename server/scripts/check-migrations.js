import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionsDir = path.resolve(__dirname, '../db/migrations/versions');

const files = fs.readdirSync(versionsDir)
  .filter((name) => /^\d{3}[-_].*\.js$/.test(name))
  .sort();

if (!files.length) {
  console.error('No migration files found in server/db/migrations/versions');
  process.exit(1);
}

const versions = files.map((name) => Number(name.slice(0, 3)));
const uniqueVersions = new Set(versions);

if (uniqueVersions.size !== versions.length) {
  console.error('Duplicate migration versions detected:', files.join(', '));
  process.exit(1);
}

for (let index = 0; index < versions.length; index += 1) {
  const expected = index + 1;
  if (versions[index] !== expected) {
    console.error(`Migration versions must stay contiguous. Expected ${String(expected).padStart(3, '0')} but found ${String(versions[index]).padStart(3, '0')}.`);
    process.exit(1);
  }
}

console.log(`Migration check passed: ${files.length} version files in order.`);
