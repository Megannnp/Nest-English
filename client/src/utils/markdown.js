/**
 * client/src/utils/markdown.js
 *
 * 支持标准 Markdown + 扩展标签：
 *   [color=#hex]文字[/color]   — 颜色
 *   [size=large]文字[/size]    — 字号：large / medium / small
 */
import DOMPurify from 'dompurify';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SIZE_MAP = {
  large:  '15px',
  medium: '13px',
  small:  '11px',
};

function parseInline(text) {
  return escapeHtml(text)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    .replace(/`(.+?)`/g,           '<code>$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // 颜色标签 [color=#hex]...[/color]
    .replace(/\[color=(#[0-9a-fA-F]{3,6})\](.+?)\[\/color\]/g,
      (_, hex, content) => `<span style="color:${hex}">${content}</span>`)
    // 字号标签 [size=large/medium/small]...[/size]
    .replace(/\[size=(large|medium|small)\](.+?)\[\/size\]/g,
      (_, sz, content) => `<span style="font-size:${SIZE_MAP[sz]}">${content}</span>`);
}

function isCodeFence(line) {
  return line.startsWith('```');
}

function matchHeading(line) {
  return [
    { regex: /^###\s+(.+)/, tag: 'h3' },
    { regex: /^##\s+(.+)/, tag: 'h2' },
    { regex: /^#\s+(.+)/, tag: 'h1' },
  ].find(({ regex }) => regex.test(line)) || null;
}

function isHorizontalRule(line) {
  return /^---+$/.test(line.trim());
}

function isUnorderedListItem(line) {
  return /^[-*+]\s+/.test(line);
}

function isOrderedListItem(line) {
  return /^\d+\.\s+/.test(line);
}

function isBlankLine(line) {
  return line.trim() === '';
}

function isParagraphBoundary(line) {
  return (
    isBlankLine(line)
    || line.startsWith('#')
    || isCodeFence(line)
    || isUnorderedListItem(line)
    || isOrderedListItem(line)
    || isHorizontalRule(line)
  );
}

function consumeCodeBlock(lines, startIndex) {
  const codeLines = [];
  let index = startIndex + 1;

  while (index < lines.length && !isCodeFence(lines[index])) {
    codeLines.push(escapeHtml(lines[index]));
    index += 1;
  }

  return {
    html: `<pre><code>${codeLines.join('\n')}</code></pre>`,
    nextIndex: index + 1,
  };
}

function consumeHeading(line) {
  const heading = matchHeading(line);
  if (!heading) return null;
  const match = line.match(heading.regex);
  return `<${heading.tag}>${parseInline(match[1])}</${heading.tag}>`;
}

function consumeList(lines, startIndex, ordered) {
  const matcher = ordered ? isOrderedListItem : isUnorderedListItem;
  const stripPattern = ordered ? /^\d+\.\s+/ : /^[-*+]\s+/;
  const items = [];
  let index = startIndex;

  while (index < lines.length && matcher(lines[index])) {
    items.push(`<li>${parseInline(lines[index].replace(stripPattern, ''))}</li>`);
    index += 1;
  }

  return {
    html: `<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`,
    nextIndex: index,
  };
}

function consumeParagraph(lines, startIndex) {
  const paraLines = [];
  let index = startIndex;

  while (index < lines.length && !isParagraphBoundary(lines[index])) {
    paraLines.push(parseInline(lines[index]));
    index += 1;
  }

  if (!paraLines.length) return null;
  return {
    html: `<p>${paraLines.join('<br>')}</p>`,
    nextIndex: index,
  };
}

export function parseMarkdown(md) {
  if (!md) return '';

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isCodeFence(line)) {
      const block = consumeCodeBlock(lines, i);
      html.push(block.html);
      i = block.nextIndex;
      continue;
    }

    const headingHtml = consumeHeading(line);
    if (headingHtml) {
      html.push(headingHtml);
      i += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      html.push('<hr>');
      i += 1;
      continue;
    }

    if (isUnorderedListItem(line)) {
      const list = consumeList(lines, i, false);
      html.push(list.html);
      i = list.nextIndex;
      continue;
    }

    if (isOrderedListItem(line)) {
      const list = consumeList(lines, i, true);
      html.push(list.html);
      i = list.nextIndex;
      continue;
    }

    if (isBlankLine(line)) {
      i += 1;
      continue;
    }

    const paragraph = consumeParagraph(lines, i);
    if (paragraph) {
      html.push(paragraph.html);
      i = paragraph.nextIndex;
    }
  }

  return DOMPurify.sanitize(html.join('\n'), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'h1', 'h2', 'h3', 'hr', 'ul', 'ol', 'li', 'a', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
    ALLOWED_URI_REGEXP: /^https?:\/\//i,
  });
}
