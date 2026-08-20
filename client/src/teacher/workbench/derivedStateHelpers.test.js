import { describe, expect, it } from 'vitest';

import { buildAssignmentDirectoryState } from './derivedStateHelpers.js';

describe('buildAssignmentDirectoryState', () => {
  it('excludes archived assignments from counts and filtered items', () => {
    const result = buildAssignmentDirectoryState([
      { id: 'draft-1', status: 'draft' },
      { id: 'published-1', status: 'published' },
      { id: 'closed-1', status: 'closed' },
      { id: 'archived-1', status: 'archived' },
    ], 'all');

    expect(result.counts).toEqual({
      all: 3,
      draft: 1,
      published: 1,
      closed: 1,
    });
    expect(result.filtered.map((item) => item.id)).toEqual(['draft-1', 'published-1', 'closed-1']);
  });

  it('filters by the requested status', () => {
    const result = buildAssignmentDirectoryState([
      { id: 'draft-1', status: 'draft' },
      { id: 'draft-2', status: 'draft' },
      { id: 'published-1', status: 'published' },
    ], 'draft');

    expect(result.filtered.map((item) => item.id)).toEqual(['draft-1', 'draft-2']);
  });
});
