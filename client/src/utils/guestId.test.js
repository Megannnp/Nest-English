import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrCreateGuestId } from './guestId.js';

describe('guest id', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('replaces invalid stored ids and works without randomUUID', () => {
    window.localStorage.setItem('nest_guest_id', 'bad-id');
    vi.stubGlobal('crypto', {
      getRandomValues(values) {
        values.fill(10);
        return values;
      },
    });

    const id = getOrCreateGuestId();

    expect(id).toMatch(/^guest_[a-zA-Z0-9]{8,58}$/);
    expect(id).not.toBe('bad-id');
    expect(window.localStorage.getItem('nest_guest_id')).toBe(id);
  });
});
