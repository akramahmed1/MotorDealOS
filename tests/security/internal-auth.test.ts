import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bearerSecretOk, headerSecretOk, rejectIfUnauthed } from '../../src/lib/internal-auth';

describe('header secrets', () => {
  it('rejects when the expected secret is unset', () => {
    assert.equal(headerSecretOk('anything', undefined), false);
    assert.equal(headerSecretOk('anything', ''), false);
  });

  it('rejects a missing or wrong header', () => {
    assert.equal(headerSecretOk(null, 's3cret'), false);
    assert.equal(headerSecretOk('nope', 's3cret'), false);
  });

  it('accepts an exact match and rejects a different length', () => {
    assert.equal(headerSecretOk('s3cret', 's3cret'), true);
    assert.equal(headerSecretOk('s3cret-extra', 's3cret'), false);
  });

  it('rejects oversized values', () => {
    assert.equal(headerSecretOk('x'.repeat(513), 'x'.repeat(513)), false);
  });
});

describe('cron bearer', () => {
  it('fails closed when CRON_SECRET is unset', () => {
    assert.equal(bearerSecretOk('Bearer something', undefined), false);
    assert.equal(bearerSecretOk(null, undefined), false);
    assert.equal(bearerSecretOk(null, ''), false);
  });

  it('rejects a missing or wrong bearer token', () => {
    assert.equal(bearerSecretOk(null, 'cron-secret'), false);
    assert.equal(bearerSecretOk('Bearer wrong', 'cron-secret'), false);
    assert.equal(bearerSecretOk('cron-secret', 'cron-secret'), false);
  });

  it('accepts the exact bearer value', () => {
    assert.equal(bearerSecretOk('Bearer cron-secret', 'cron-secret'), true);
  });
});

describe('rejectIfUnauthed', () => {
  it('returns 401 when the header does not match', () => {
    const res = rejectIfUnauthed(new Request('http://localhost', { method: 'POST' }), 's3cret');
    assert.equal(res?.status, 401);
  });

  it('returns null when the header matches', () => {
    const res = rejectIfUnauthed(
      new Request('http://localhost', { method: 'POST', headers: { 'x-owner-alert-secret': 's3cret' } }),
      's3cret',
    );
    assert.equal(res, null);
  });
});
