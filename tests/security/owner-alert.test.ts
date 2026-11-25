import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { handleOwnerAlert } from '../../supabase/functions/_shared/owner-alert-handler';
import { handleLeadNotify } from '../../supabase/functions/_shared/lead-notify-handler';

function request(secret?: string, body?: unknown) {
  return new Request('http://localhost/functions/v1/owner-alert', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-owner-alert-secret': secret } : {}),
    },
    body: body === undefined ? '{"subject":"Hi","message":"There"}' : JSON.stringify(body),
  });
}

describe('owner-alert', () => {
  it('does not send mail when the secret is missing or wrong', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response('nope', { status: 500 });
    };
    const missing = await handleOwnerAlert(request(), { secret: undefined, resendKey: 'rk' }, fetchImpl);
    const wrong = await handleOwnerAlert(request('nope'), { secret: 'right', resendKey: 'rk' }, fetchImpl);
    assert.equal(missing.status, 401);
    assert.equal(wrong.status, 401);
    assert.equal(calls, 0);
  });

  it('sends mail only after the secret matches', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response('sent', { status: 200 });
    };
    const res = await handleOwnerAlert(
      request('right', { subject: 'Weekly CSV export failed', message: 'disk full' }),
      { secret: 'right', resendKey: 'rk' },
      fetchImpl,
    );
    assert.equal(res.status, 200);
    assert.equal(calls, 1);
  });

  it('is wired to OWNER_ALERT_SECRET in the deployed function', () => {
    const source = readFileSync(new URL('../../supabase/functions/owner-alert/index.ts', import.meta.url), 'utf8');
    assert.match(source, /OWNER_ALERT_SECRET/);
    assert.match(source, /handleOwnerAlert/);
  });
});

describe('lead-notify', () => {
  it('does not send mail when the caller only has the anon key', async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response('sent', { status: 200 });
    };
    const res = await handleLeadNotify(
      request(undefined, { type: 'INSERT', table: 'leads', record: { phone: '7735550100', source: 'website' } }),
      { secret: 'right', resendKey: 'rk' },
      fetchImpl,
    );
    assert.equal(res.status, 401);
    assert.equal(calls, 0);
  });

  it('is wired to the same secret as owner-alert', () => {
    const source = readFileSync(new URL('../../supabase/functions/lead-notify/index.ts', import.meta.url), 'utf8');
    assert.match(source, /OWNER_ALERT_SECRET/);
    assert.match(source, /handleLeadNotify/);
  });
});
