import { describe, expect, it } from 'vitest';

import { parseMarkdown } from './markdown.js';

describe('parseMarkdown', () => {
  it('renders markdown headings, emphasis, color and size tags', () => {
    const html = parseMarkdown([
      '## 公告标题',
      '',
      '**加粗** 与 *斜体*',
      '',
      '[color=#2563a8]蓝色内容[/color]',
      '[size=large]大字号[/size]',
    ].join('\n'));

    expect(html).toContain('<h2>公告标题</h2>');
    expect(html).toContain('<strong>加粗</strong>');
    expect(html).toContain('<em>斜体</em>');
    expect(html).toContain('style="color:#2563a8"');
    expect(html).toContain('style="font-size:15px"');
  });

  it('escapes raw html instead of injecting it', () => {
    const html = parseMarkdown('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});
