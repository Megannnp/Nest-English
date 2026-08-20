import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveRequestGuestId } from '../routes/announcements.js';
import { buildMessageRateLimitKey } from '../utils/rateLimitKeys.js';

test('guest message identity prefers header and rejects invalid ids', () => {
  assert.equal(
    resolveRequestGuestId({
      headers: { 'x-guest-id': 'guest_abc123456789' },
      body: { guestId: 'guest_body123456' },
      query: { guestId: 'guest_query123456' },
    }),
    'guest_abc123456789'
  );

  assert.equal(
    resolveRequestGuestId({
      headers: { 'x-guest-id': 'bad-id' },
      body: {},
      query: {},
    }),
    null
  );
});

test('guest message rate limit key ignores spoofable guest ids', () => {
  const req = {
    ip: '203.0.113.10',
    headers: { 'x-guest-id': 'guest_first123456' },
    body: { guestId: 'guest_second123456' },
  };

  assert.equal(buildMessageRateLimitKey(req), 'ip:203.0.113.10');
});
