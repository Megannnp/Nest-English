import { describe, expect, it, vi } from 'vitest';

import { buildSwitchItems } from './productSwitcher.js';

describe('product switcher', () => {
  it('includes the speaking module after launch', () => {
    const items = buildSwitchItems('筑巢语法', vi.fn());

    expect(items.map((item) => item.label)).toContain('筑巢口语');
  });

  it('excludes the current speaking product from its own switcher', () => {
    const items = buildSwitchItems('筑巢口语', vi.fn());

    expect(items.map((item) => item.label)).not.toContain('筑巢口语');
  });
});
