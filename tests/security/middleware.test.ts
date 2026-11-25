import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('dashboard middleware', () => {
  it('decides access with getUser and not getSession', () => {
    const source = readFileSync(new URL('../../middleware.ts', import.meta.url), 'utf8');
    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.doesNotMatch(source, /getSession\(/);
  });
});
