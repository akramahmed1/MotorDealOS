import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { handleChatPost, type ChatDeps } from '../../src/app/api/chat/route';
import type { ChatStore } from '../../src/lib/chat-store';
import { DEALERSHIP_COMPANY_ID } from '../../src/lib/site-config';
import type { LeadInput } from '../../src/lib/leads';

function memoryStore(): ChatStore & { messages: { role: string; content: string }[]; companyId?: string } {
  const messages: { role: string; content: string }[] = [];
  const store: ChatStore & { messages: { role: string; content: string }[]; companyId?: string } = {
    messages,
    async findSession() {
      return null;
    },
    async createSession(input) {
      store.companyId = input.companyId;
      return { session: { id: 'session-1', session_token: input.sessionToken, lead_id: null } };
    },
    async addMessage(_sessionId, role, content) {
      messages.push({ role, content });
    },
    async linkLead() {},
    async recentMessages() {
      return messages.map((m) => ({ role: m.role, content: m.content }));
    },
  };
  return store;
}

describe('POST /api/chat', () => {
  it('does not use the anon server client for transcripts', () => {
    const source = readFileSync(new URL('../../src/app/api/chat/route.ts', import.meta.url), 'utf8');
    assert.match(source, /createChatStore\(\)/);
    assert.doesNotMatch(source, /supabase\/server/);
  });

  it('returns 429 before writing a session when the limiter refuses', async () => {
    let created = false;
    const store = memoryStore();
    store.createSession = async () => {
      created = true;
      return { error: 'should not run' };
    };
    const deps: ChatDeps = {
      checkRateLimit: async () => false,
      store,
      getLiveVehicles: async () => [],
      getChatCompletion: async () => 'hi',
      createLead: async () => ({ id: 'nope' }),
    };
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '1.2.3.4' },
      body: JSON.stringify({ message: 'Any SUVs?' }),
    });
    const res = await handleChatPost(req, deps);
    assert.equal(res.status, 429);
    assert.equal(created, false);
  });

  it('records the session for this dealership and files a chat lead server-side', async () => {
    const store = memoryStore();
    const captured: { lead: LeadInput | null } = { lead: null };
    let limitedIp = '';
    const deps: ChatDeps = {
      checkRateLimit: async (ip) => {
        limitedIp = ip;
        return true;
      },
      store,
      getLiveVehicles: async () => [],
      getChatCompletion: async () => 'We can help with that.',
      createLead: async (input) => {
        captured.lead = input;
        return { id: 'lead-chat' };
      },
    };
    const req = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '1.2.3.4' },
      body: JSON.stringify({
        message: 'I want a test drive',
        contact: { name: 'Sam', phone: '7735550100', email: '', consent: true },
      }),
    });
    const res = await handleChatPost(req, deps);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.lead_captured, true);
    assert.equal(body.reply, 'We can help with that.');
    assert.equal(limitedIp, '1.2.3.4');
    assert.equal(store.companyId, DEALERSHIP_COMPANY_ID);
    assert.equal(captured.lead?.source, 'chat_agent');
    assert.equal(captured.lead?.company_id, DEALERSHIP_COMPANY_ID);
    assert.deepEqual(
      store.messages.map((m) => m.role),
      ['user', 'assistant'],
    );
  });
});
