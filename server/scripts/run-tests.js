import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const TESTS_DIR = new URL('../tests/', import.meta.url);
const TEST_SUFFIXES = new Map([
  ['unit', '.unit.test.js'],
  ['http', '.http.test.js'],
  ['mysql', '.mysql.test.js'],
]);

function categorizeTest(filename) {
  for (const [category, suffix] of TEST_SUFFIXES.entries()) {
    if (filename.endsWith(suffix)) {
      return category;
    }
  }
  return null;
}

function shouldInclude(category, filename) {
  const testCategory = categorizeTest(filename);
  if (!testCategory) {
    return false;
  }
  if (category === 'all') {
    return true;
  }
  return testCategory === category;
}

async function listTestFiles(category) {
  const entries = await readdir(TESTS_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((filename) => shouldInclude(category, filename))
    .sort((left, right) => left.localeCompare(right))
    .map((filename) => path.join('tests', filename));
}

const category = process.argv[2] ?? 'unit';
const extraArgs = process.argv.slice(3);
const validCategories = new Set(['unit', 'http', 'mysql', 'all']);

if (!validCategories.has(category)) {
  console.error(`Unsupported test category: ${category}`);
  process.exit(1);
}

const files = await listTestFiles(category);

if (files.length === 0) {
  console.error(`No test files found for category: ${category}`);
  process.exit(1);
}

const env = { ...process.env };
env.NODE_ENV = 'test';
env.JWT_SECRET ||= 'test-secret';
if (category === 'mysql' || category === 'all') {
  env.RUN_MYSQL_INTEGRATION ??= '1';
  env.SKIP_DB_INIT ??= '0';
  env.DB_INIT_MODE ??= 'migrate';
} else {
  env.SKIP_DB_INIT ??= '1';
}
if (category === 'http') {
  env.SKIP_ENTITLEMENT_CONSUMPTION_FOR_TESTS ??= '1';
}
// Unit tests must not open sockets at all; http/mysql suites legitimately do.
env.NEST_TEST_ISOLATION = category === 'unit' ? 'strict' : 'network-only';

// Unit tests may use mock.module() to isolate DB and service dependencies.
// The flag is harmless for files that don't use it.
// The no-network guard is preloaded here rather than from tests/testSetup.js so
// it also covers the unit tests that don't import that file.
const nodeFlags = (category === 'unit' || category === 'all')
  ? [
      '--experimental-test-module-mocks',
      '--import',
      new URL('../tests/helpers/noNetwork.js', import.meta.url).href,
    ]
  : [];
const testFlags = category === 'http' ? ['--test-concurrency=1'] : [];

const child = spawn(process.execPath, [...nodeFlags, '--test', ...testFlags, ...extraArgs, ...files], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
