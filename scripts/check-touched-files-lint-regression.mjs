import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const baseRef = process.env.GITHUB_BASE_REF;
const failOnWarningRegression = process.env.LINT_REGRESSION_WARNINGS === '1';
const tempRoot = path.join(repoRoot, '.tmp', 'lint-baseline');

function baseRemoteRef() {
  return `refs/remotes/origin/${baseRef}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function isLintTarget(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return false;
  return filePath.startsWith('client/src/') || filePath.startsWith('server/');
}

function summarizeByFile(results, transformPath = (value) => value) {
  return new Map(
    results.map((item) => [
      transformPath(item.filePath),
      {
        warnings: item.warningCount || 0,
        errors: item.errorCount || 0,
      },
    ])
  );
}

async function getTouchedFiles() {
  const diff = await run('git', ['diff', '--name-only', '--diff-filter=ACMR', baseRemoteRef(), 'HEAD']);
  if (diff.code !== 0) {
    throw new Error(diff.stderr || `git diff failed with code ${diff.code}`);
  }

  return diff.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(isLintTarget);
}

async function lintFiles(targets, cwd = repoRoot) {
  if (!targets.length) return [];
  const result = await run('npx', ['eslint', '--format', 'json', ...targets], { cwd });
  if (!result.stdout.trim()) {
    if (result.stderr.trim()) {
      throw new Error(result.stderr);
    }
    return [];
  }
  const parsed = JSON.parse(result.stdout);
  if (result.code > 1) {
    throw new Error(result.stderr || `eslint failed with code ${result.code}`);
  }
  return parsed;
}

async function materializeBaseFiles(files) {
  await fs.rm(tempRoot, { recursive: true, force: true });
  const existingBaseFiles = [];

  for (const file of files) {
    const show = await run('git', ['show', `${baseRemoteRef()}:${file}`]);
    if (show.code !== 0) {
      continue;
    }

    const tempFile = path.join(tempRoot, file);
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, show.stdout, 'utf8');
    existingBaseFiles.push({ repoPath: file, tempPath: tempFile });
  }

  return existingBaseFiles;
}

async function ensureBaseRef() {
  const verify = await run('git', ['rev-parse', '--verify', '--quiet', baseRemoteRef()]);
  if (verify.code === 0) return;

  const fetch = await run('git', [
    'fetch',
    '--no-tags',
    '--depth=1',
    'origin',
    `+refs/heads/${baseRef}:${baseRemoteRef()}`,
  ]);
  if (fetch.code !== 0) {
    throw new Error(fetch.stderr || `git fetch origin ${baseRef} failed with code ${fetch.code}`);
  }
}

function relativizeTempPath(filePath) {
  return path.relative(tempRoot, filePath).split(path.sep).join('/');
}

if (!baseRef) {
  console.log('Touched-files lint regression check skipped: GITHUB_BASE_REF is not set.');
  process.exit(0);
}

await ensureBaseRef();
const touchedFiles = await getTouchedFiles();

if (!touchedFiles.length) {
  console.log(`Touched-files lint regression check skipped: no changed JS/JSX files under client/src or server against ${baseRemoteRef()}.`);
  process.exit(0);
}

const currentResults = await lintFiles(touchedFiles);
const currentByFile = summarizeByFile(currentResults, (value) => path.relative(repoRoot, value).split(path.sep).join('/'));

const baseFiles = await materializeBaseFiles(touchedFiles);
const baseResults = await lintFiles(baseFiles.map((item) => item.tempPath));
const baseByFile = summarizeByFile(baseResults, relativizeTempPath);

const regressions = [];

for (const file of touchedFiles) {
  const current = currentByFile.get(file) || { warnings: 0, errors: 0 };
  const base = baseByFile.get(file) || { warnings: 0, errors: 0 };

  if (current.errors > 0) {
    regressions.push(`${file}: current lint has ${current.errors} error(s)`);
    continue;
  }

  if (failOnWarningRegression && current.warnings > base.warnings) {
    regressions.push(`${file}: warnings ${base.warnings} -> ${current.warnings}`);
  }
}

await fs.rm(tempRoot, { recursive: true, force: true });

if (regressions.length) {
  console.error('Touched files lint regression detected:');
  regressions.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log(`Touched-files lint regression check passed for ${touchedFiles.length} file(s) against ${baseRemoteRef()}.`);
