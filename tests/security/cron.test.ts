import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { unauthorizedCronResponse } from '../../src/app/api/cron/weekly-export/route';

const ORIGINAL = process.env.CRON_SECRET;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL;
});

function request(authorization?: string) {
  return new NextRequest('http://localhost/api/cron/weekly-export', {
    headers: authorization ? { authorization } : {},
  });
}

describe('weekly export cron', () => {
  it('returns 401 when CRON_SECRET is unset', () => {
    delete process.env.CRON_SECRET;
    const res = unauthorizedCronResponse(request('Bearer anything').headers.get('authorization'));
    assert.equal(res?.status, 401);
  });

  it('returns 401 when the bearer token is wrong', () => {
    process.env.CRON_SECRET = 'expected';
    const res = unauthorizedCronResponse(request('Bearer nope').headers.get('authorization'));
    assert.equal(res?.status, 401);
  });

  it('lets the right bearer token through', () => {
    process.env.CRON_SECRET = 'expected';
    const res = unauthorizedCronResponse(request('Bearer expected').headers.get('authorization'));
    assert.equal(res, null);
  });
});
