import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { DEALERSHIP_COMPANY_ID } from '../../src/lib/site-config';
import { createLead, resolveLeadSource, type LeadInput, type LeadWriter } from '../../src/lib/leads';
import { postLead, type LeadRouteDeps } from '../../src/app/api/leads/route';

const OTHER_COMPANY = '11111111-1111-4111-8111-111111111111';

function validLead(overrides: Partial<LeadInput> = {}): LeadInput {
  return {
    company_id: OTHER_COMPANY,
    name: 'Sam Buyer',
    phone: '7735550100',
    email: '',
    source: 'website',
    lead_score: 'warm',
    vehicle_id: null,
    notes: '',
    consent: true,
    ...overrides,
  };
}

function writer(capture: { row?: Record<string, unknown> }): LeadWriter {
  return {
    from() {
      return {
        insert(row) {
          capture.row = row;
          return {
            select() {
              return { single: async () => ({ data: { id: 'lead-1' }, error: null }) };
            },
          };
        },
      };
    },
  };
}

describe('createLead', () => {
  it('stores the dealership id, not the id the caller passed', async () => {
    const capture: { row?: Record<string, unknown> } = {};
    const result = await createLead(validLead({ source: 'cargurus' }), writer(capture));
    assert.deepEqual(result, { id: 'lead-1' });
    assert.equal(capture.row?.company_id, DEALERSHIP_COMPANY_ID);
    assert.deepEqual(capture.row?.source_metadata, { consent: true, consent_text_version: 'v1' });
  });

  it('refuses a lead without consent and does not insert', async () => {
    const capture: { row?: Record<string, unknown> } = {};
    const result = await createLead(validLead({ consent: false }), writer(capture));
    assert.deepEqual(result, { error: 'Consent is required.' });
    assert.equal(capture.row, undefined);
  });
});

describe('resolveLeadSource', () => {
  it('lets an anonymous visitor file only a website lead', () => {
    assert.deepEqual(resolveLeadSource('website', false), {
      company_id: DEALERSHIP_COMPANY_ID,
      source: 'website',
    });
    assert.deepEqual(resolveLeadSource('cargurus', false), { error: 'That lead source is not allowed.' });
    assert.deepEqual(resolveLeadSource('facebook', false), { error: 'That lead source is not allowed.' });
  });

  it('lets staff file quick-add sources and still not invent a CarGurus lead', () => {
    const walkin = resolveLeadSource('walkin', true);
    assert.equal('source' in walkin ? walkin.source : '', 'walkin');
    assert.deepEqual(resolveLeadSource('chat_agent', true), { error: 'That lead source is not allowed.' });
    assert.deepEqual(resolveLeadSource('cargurus', true), { error: 'That lead source is not allowed.' });
  });
});

function leadRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function deps(partial: Partial<LeadRouteDeps> & Pick<LeadRouteDeps, 'getUser' | 'createLead'>): LeadRouteDeps {
  return {
    checkRateLimit: async () => true,
    ...partial,
  };
}

describe('POST /api/leads', () => {
  it('ignores a client company id and rejects a forged source', async () => {
    let called = false;
    const res = await postLead(
      leadRequest({
        company_id: OTHER_COMPANY,
        name: 'Sam',
        phone: '7735550100',
        email: '',
        source: 'cargurus',
        consent: true,
      }),
      deps({
        getUser: async () => null,
        createLead: async () => {
          called = true;
          return { id: 'nope' };
        },
      }),
    );
    assert.equal(res.status, 400);
    assert.equal(called, false);
  });

  it('writes a website lead under the dealership id and limits by real ip', async () => {
    const captured: { lead: LeadInput | null; limited: { id: string; max: number } | null } = {
      lead: null,
      limited: null,
    };
    const res = await postLead(
      leadRequest(
        {
          company_id: OTHER_COMPANY,
          name: 'Sam',
          phone: '7735550100',
          email: '',
          source: 'website',
          consent: true,
        },
        { 'x-real-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' },
      ),
      deps({
        getUser: async () => null,
        checkRateLimit: async (id, _endpoint, max) => {
          captured.limited = { id, max };
          return true;
        },
        createLead: async (input) => {
          captured.lead = input;
          return { id: 'lead-9' };
        },
      }),
    );
    assert.equal(res.status, 201);
    assert.equal(captured.lead?.company_id, DEALERSHIP_COMPANY_ID);
    assert.equal(captured.lead?.source, 'website');
    assert.deepEqual(captured.limited, { id: '1.2.3.4', max: 10 });
  });

  it('lets a signed-in staff member set a quick-add source, counted against their user id', async () => {
    const captured: { lead: LeadInput | null; identifier: string } = { lead: null, identifier: '' };
    const res = await postLead(
      leadRequest({
        company_id: OTHER_COMPANY,
        name: 'Walk In',
        phone: '7735550199',
        source: 'walkin',
        consent: true,
      }),
      deps({
        getUser: async () => ({ id: 'staff-1' }),
        checkRateLimit: async (id) => {
          captured.identifier = id;
          return true;
        },
        createLead: async (input) => {
          captured.lead = input;
          return { id: 'lead-2' };
        },
      }),
    );
    assert.equal(res.status, 201);
    assert.equal(captured.lead?.source, 'walkin');
    assert.equal(captured.lead?.company_id, DEALERSHIP_COMPANY_ID);
    assert.equal(captured.identifier, 'user:staff-1');
  });

  it('returns 429 when the limiter refuses', async () => {
    const res = await postLead(
      leadRequest({
        name: 'Sam',
        phone: '7735550100',
        source: 'website',
        consent: true,
      }),
      deps({
        getUser: async () => null,
        checkRateLimit: async () => false,
        createLead: async () => ({ id: 'should-not-run' }),
      }),
    );
    assert.equal(res.status, 429);
  });
});
