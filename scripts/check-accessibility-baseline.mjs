import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const sourceRoot = path.join(rootDir, 'client/src');
const knownDebtByFile = new Map([
]);

const knownInteractiveDebtByFile = new Map([
]);
const knownClickableDivDebtByFile = new Map([
]);
const knownImageAltDebtByFile = new Map([
]);

function toRepoPath(targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join('/');
}

async function collectJsxFiles(dirPath, results = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectJsxFiles(fullPath, results);
    } else if (entry.isFile() && fullPath.endsWith('.jsx') && !fullPath.endsWith('.test.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isWrappedByLabel(source, index) {
  const before = source.slice(0, index);
  return before.lastIndexOf('<label') > before.lastIndexOf('</label>')
    || before.lastIndexOf('<Field') > before.lastIndexOf('</Field>');
}

function hasAccessibleName(tagSource, fileSource, index) {
  if (/\b(?:aria-label|aria-labelledby|title)=/.test(tagSource)) return true;
  if (isWrappedByLabel(fileSource, index)) return true;
  const idMatch = tagSource.match(/\bid=["']([^"']+)["']/);
  if (idMatch) {
    const id = idMatch[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`<label[^>]+htmlFor=["']${id}["']`).test(fileSource)) return true;
  }
  return false;
}

function findOpeningTagEnd(source, startIndex) {
  let quote = '';
  let braceDepth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === '>' && braceDepth === 0) return index;
  }
  return -1;
}

function collectOpeningTags(source, tagNames) {
  const pattern = new RegExp(`<(${tagNames.join('|')})\\b`, 'g');
  return [...source.matchAll(pattern)].map((match) => {
    const endIndex = findOpeningTagEnd(source, match.index);
    return {
      index: match.index,
      tagSource: endIndex >= 0 ? source.slice(match.index, endIndex + 1) : match[0],
    };
  });
}

function countUnnamedControls(source) {
  const matches = collectOpeningTags(source, ['input', 'textarea']);
  return matches.filter((match) => {
    const tagSource = match.tagSource;
    if (/\btype=["'](?:hidden|file|checkbox|radio|range)["']/.test(tagSource)) return false;
    return !hasAccessibleName(tagSource, source, match.index);
  }).length;
}

function countUnnamedInteractive(source) {
  const matches = collectOpeningTags(source, ['button', 'a']);
  return matches.filter((match) => {
    const tagName = match.tagSource.match(/^<(\w+)/)?.[1];
    const openingEndIndex = findOpeningTagEnd(source, match.index);
    const closingIndex = source.indexOf(`</${tagName}>`, openingEndIndex + 1);
    const tagSource = closingIndex >= 0 ? source.slice(match.index, closingIndex) : match.tagSource;
    const attrs = match.tagSource;
    if (/\b(?:aria-label|aria-labelledby|title)=/.test(attrs)) return false;
    const text = tagSource.replace(/<[^>]+>/g, '').replace(/\{[^}]*\}/g, '').trim();
    return !text;
  }).length;
}

function countClickableDivs(source) {
  return collectOpeningTags(source, ['div'])
    .filter((match) => /\bonClick=/.test(match.tagSource))
    .length;
}

function countImagesMissingAlt(source) {
  return collectOpeningTags(source, ['img'])
    .filter((match) => !/\balt=/.test(match.tagSource))
    .length;
}

async function hasFocusVisibleRule() {
  const cssPath = path.join(rootDir, 'client/src/index.css');
  const source = await fs.readFile(cssPath, 'utf8');
  return /:focus-visible[\s\S]*outline/.test(source);
}

const files = await collectJsxFiles(sourceRoot);
const debtRows = [];
const interactiveRows = [];
const clickableDivRows = [];
const imageAltRows = [];
const reportRows = [];

for (const filePath of files) {
  const source = await fs.readFile(filePath, 'utf8');
  const count = countUnnamedControls(source);
  const interactiveCount = countUnnamedInteractive(source);
  const clickableDivCount = countClickableDivs(source);
  const missingAltCount = countImagesMissingAlt(source);
  const repoPath = toRepoPath(filePath);
  if (count || interactiveCount || clickableDivCount || missingAltCount) {
    reportRows.push({ repoPath, count, interactiveCount, clickableDivCount, missingAltCount });
  }
  const baseline = knownDebtByFile.get(repoPath) || 0;
  if (count && (count > baseline || !knownDebtByFile.has(repoPath))) {
    debtRows.push({ repoPath, count, baseline });
  }
  if (interactiveCount) {
    const interactiveBaseline = knownInteractiveDebtByFile.get(repoPath) || 0;
    if (interactiveCount > interactiveBaseline || !knownInteractiveDebtByFile.has(repoPath)) {
      interactiveRows.push({ repoPath, count: interactiveCount, baseline: interactiveBaseline });
    }
  }
  if (clickableDivCount) {
    const clickableDivBaseline = knownClickableDivDebtByFile.get(repoPath) || 0;
    if (clickableDivCount > clickableDivBaseline || !knownClickableDivDebtByFile.has(repoPath)) {
      clickableDivRows.push({ repoPath, count: clickableDivCount, baseline: clickableDivBaseline });
    }
  }
  if (missingAltCount) {
    const imageAltBaseline = knownImageAltDebtByFile.get(repoPath) || 0;
    if (missingAltCount > imageAltBaseline || !knownImageAltDebtByFile.has(repoPath)) {
      imageAltRows.push({ repoPath, count: missingAltCount, baseline: imageAltBaseline });
    }
  }
}

console.log('Accessibility baseline guard');
console.log('  rule     input/textarea controls need an accessible name');
console.log('  rule     interactive controls need visible text or an accessible name');
console.log('  rule     clickable containers must use semantic controls');
console.log('  rule     images need alt text, including empty alt for decorative images');
console.log('  rule     global focus-visible outline must exist');
console.log('  baseline existing legacy debt is capped per file');

const focusVisibleOk = await hasFocusVisibleRule();

if (process.argv.includes('--report')) {
  console.log('\nCurrent accessibility debt by file');
  reportRows
    .sort((left, right) => (
      right.count + right.interactiveCount + right.clickableDivCount + right.missingAltCount
    ) - (
      left.count + left.interactiveCount + left.clickableDivCount + left.missingAltCount
    ) || left.repoPath.localeCompare(right.repoPath))
    .forEach(({ repoPath, count, interactiveCount, clickableDivCount, missingAltCount }) => {
      console.log(`  controls ${String(count).padStart(3, ' ')}  interactive ${String(interactiveCount).padStart(3, ' ')}  div-click ${String(clickableDivCount).padStart(3, ' ')}  img-alt ${String(missingAltCount).padStart(3, ' ')}  ${repoPath}`);
    });
} else if (!focusVisibleOk) {
  console.log('\nMissing global focus-visible outline in client/src/index.css');
  process.exitCode = 1;
} else if (debtRows.length) {
  console.log('\nNew or increased unnamed controls');
  debtRows
    .sort((left, right) => right.count - left.count || left.repoPath.localeCompare(right.repoPath))
    .forEach(({ repoPath, count, baseline }) => {
      console.log(`  ${String(count).padStart(3, ' ')}  ${repoPath} (baseline ${baseline})`);
    });
  process.exitCode = 1;
} else if (interactiveRows.length) {
  console.log('\nUnnamed buttons or links');
  interactiveRows
    .sort((left, right) => right.count - left.count || left.repoPath.localeCompare(right.repoPath))
    .forEach(({ repoPath, count, baseline }) => {
      console.log(`  ${String(count).padStart(3, ' ')}  ${repoPath} (baseline ${baseline})`);
    });
  process.exitCode = 1;
} else if (clickableDivRows.length) {
  console.log('\nClickable divs');
  clickableDivRows
    .sort((left, right) => right.count - left.count || left.repoPath.localeCompare(right.repoPath))
    .forEach(({ repoPath, count, baseline }) => {
      console.log(`  ${String(count).padStart(3, ' ')}  ${repoPath} (baseline ${baseline})`);
    });
  process.exitCode = 1;
} else if (imageAltRows.length) {
  console.log('\nImages missing alt');
  imageAltRows
    .sort((left, right) => right.count - left.count || left.repoPath.localeCompare(right.repoPath))
    .forEach(({ repoPath, count, baseline }) => {
      console.log(`  ${String(count).padStart(3, ' ')}  ${repoPath} (baseline ${baseline})`);
    });
  process.exitCode = 1;
} else {
  console.log('\nNo accessibility baseline regressions found.');
}
