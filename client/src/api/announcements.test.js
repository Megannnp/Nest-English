import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchMyMessages, fetchTickerData } from './announcements.js';

describe('announcement api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends guest id in headers instead of query strings', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { announcements: [], myMessages: [] } }), { status: 200 })
    );

    await fetchTickerData('guest_abc123456789');
    await fetchMyMessages('guest_abc123456789');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/announcements/ticker',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Guest-Id': 'guest_abc123456789' }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/messages/mine',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Guest-Id': 'guest_abc123456789' }),
      })
    );
  });
});
