import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clientIpFromHeaders } from '../../src/lib/client-ip';

describe('clientIpFromHeaders', () => {
  it('prefers x-real-ip over a spoofed leftmost forwarded address', () => {
    const headers = new Headers({
      'x-real-ip': '1.2.3.4',
      'x-forwarded-for': '9.9.9.9, 1.2.3.4',
    });
    assert.equal(clientIpFromHeaders(headers), '1.2.3.4');
  });

  it('uses the rightmost forwarded hop when x-real-ip is absent', () => {
    const headers = new Headers({ 'x-forwarded-for': '9.9.9.9, 8.8.8.8' });
    assert.equal(clientIpFromHeaders(headers), '8.8.8.8');
  });

  it('returns unknown when no address header is present', () => {
    assert.equal(clientIpFromHeaders(new Headers()), 'unknown');
  });
});
