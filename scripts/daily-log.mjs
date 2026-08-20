import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function buildDailyLog() {
  const date = today();
  const branch = run('git rev-parse --abbrev-ref HEAD');
  const commits = run('git log --since="00:00 today" --oneline');
  const changedFiles = run('git diff --name-only HEAD~5..HEAD 2>/dev/null || git diff --name-only');

  const moduleHits = new Map();
  for (const file of changedFiles.split('\n').filter(Boolean)) {
    const match = file.match(/client\/src\/([^/]+)\//);
    if (match) {
      const mod = match[1];
      if (!['app', 'components', 'hooks', 'utils', 'styles', 'constants', 'api'].includes(mod)) {
        moduleHits.set(mod, (moduleHits.get(mod) || 0) + 1);
      }
    }
    const serverMatch = file.match(/server\/routes\/([^/]+)/);
    if (serverMatch) {
      const mod = serverMatch[1].replace(/\.js$/, '').replace(/Routes$/, '').replace(/s$/, '');
      moduleHits.set(mod, (moduleHits.get(mod) || 0) + 1);
    }
  }

  const activeModules = [...moduleHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mod, count]) => `- ${mod} (${count} files)`);

  const lines = [
    `# Daily Log — ${date}`,
    '',
    `**Branch:** \`${branch}\``,
    '',
    '## Commits Today',
    '',
    commits ? commits.split('\n').map((l) => `- ${l}`).join('\n') : '- (no commits today)',
    '',
    '## Active Modules',
    '',
    activeModules.length ? activeModules.join('\n') : '- (no module changes detected)',
    '',
    '## Context for AI',
    '',
    '> Read `docs/NESTOS_CONTEXT.md` and `docs/MODULES.md` before making changes.',
    `> Current branch: \`${branch}\``,
    `> Last updated: ${new Date().toISOString()}`,
    '',
  ];

  const logDir = path.join(ROOT, 'docs/daily');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, `${date}.md`);
  fs.writeFileSync(logPath, lines.join('\n'), 'utf8');
  console.log(`- docs/daily/${date}.md`);
}

buildDailyLog();
