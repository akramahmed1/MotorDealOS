import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const sql = readFileSync(
  new URL('../../supabase/migrations/20261125120000_revoke_anon_chat_and_rate_limits.sql', import.meta.url),
  'utf8',
);

describe('anon lock-down migration', () => {
  it('drops anon and public policies and revokes privileges on the three tables', () => {
    for (const table of ['chat_sessions', 'chat_messages', 'rate_limits']) {
      assert.match(sql, new RegExp(table));
      assert.match(sql, new RegExp(`revoke all privileges on table public\\.${table} from anon`));
      assert.match(sql, new RegExp(`revoke all privileges on table public\\.${table} from public`));
    }
    assert.match(sql, /rolname = 'anon'/);
    assert.match(sql, /drop policy if exists/);
    assert.match(sql, /enable row level security/);
  });

  it('does not grant anything back to anon and does not embed a key', () => {
    assert.doesNotMatch(sql, /create policy/i);
    assert.doesNotMatch(sql, /grant /i);
    assert.doesNotMatch(sql, /service_role/i);
    assert.doesNotMatch(sql, /eyJ/);
  });
});
