import { spawn } from 'node:child_process';

const maxWarnings = Number(process.env.LINT_WARNING_BUDGET || 0);

function runEslint() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['eslint', 'client/src', 'server', '--ext', '.js,.jsx', '--format', 'json'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      }
    );

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

function summarizeLintResults(results) {
  return results.reduce((summary, item) => {
    summary.errors += item.errorCount || 0;
    summary.warnings += item.warningCount || 0;
    return summary;
  }, { errors: 0, warnings: 0 });
}

const { code, stdout, stderr } = await runEslint();

if (!stdout.trim()) {
  if (stderr.trim()) {
    process.stderr.write(stderr);
  }
  throw new Error('eslint 未返回可解析结果');
}

const results = JSON.parse(stdout);
const summary = summarizeLintResults(results);

console.log(`Lint warning budget check: ${summary.warnings} warnings, ${summary.errors} errors (budget ${maxWarnings})`);

if (stderr.trim()) {
  process.stderr.write(stderr);
}

if (summary.errors > 0) {
  process.exitCode = 1;
} else if (summary.warnings > maxWarnings) {
  console.error(`Lint warnings exceeded budget: ${summary.warnings} > ${maxWarnings}`);
  process.exitCode = 1;
} else if (code !== 0 && summary.errors === 0) {
  process.exitCode = 1;
}
