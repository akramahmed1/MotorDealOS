import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getChatCompletion, type ChatMessage } from '@/lib/ai';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLead, type LeadInput } from '@/lib/leads';
import { getLiveVehicles } from '@/lib/vehicles';
import { clientIpFromHeaders } from '@/lib/client-ip';
import { createChatStore, type ChatStore } from '@/lib/chat-store';
import { DEALERSHIP_COMPANY_ID } from '@/lib/site-config';

// Gives the route's own 20s AI-call timeout (src/lib/ai.ts) room to fire and
// be caught gracefully, rather than Vercel's platform-level function timeout
// killing the request first with no chance to log or return a fallback.
export const maxDuration = 30;

const chatRequestSchema = z.object({
  session_token: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(1000),
  vehicle_id: z.string().uuid().nullable().optional(),
  contact: z
    .object({
      name: z.string().trim().min(1).max(200),
      phone: z.string().trim().min(7).max(30),
      email: z.string().trim().email().optional().or(z.literal('')),
      consent: z.boolean(),
    })
    .optional(),
});

const DEALERSHIP_FACTS = `
MOTOR DEALS USA — 1822 Johns Drive, Glenview, IL 60025.
Phone: (773) 350-0002.
Hours: Mon–Sat 10:00 AM – 7:00 PM, Sunday closed.
Financing: we work with bank pre-approvals; ask the customer to bring or arrange a pre-approval, or discuss cash purchase.
Trade-ins: welcomed — ask for year/make/model/mileage/condition to start.
Price note: prices exclude tax, title, license, and documentation fee.
`.trim();

function formatInventorySnapshot(vehicles: Awaited<ReturnType<typeof getLiveVehicles>>): string {
  return vehicles
    .slice(0, 40)
    .map((v) => `${v.year ?? ''} ${v.make ?? ''} ${v.model ?? ''} ${v.trim ?? ''} — $${v.price ?? '?'} — ${v.miles ?? '?'}mi — ${v.body_style ?? ''}`.trim())
    .join('\n');
}

// The system prompt only asks the model to cap vehicle lists at 5 — models
// don't reliably follow that, so enforce it here regardless of what came back.
const MAX_VEHICLES_PER_REPLY = 5;

function capVehicleList(reply: string, max = MAX_VEHICLES_PER_REPLY): string {
  const lines = reply.split('\n');
  const bulletIndices = lines
    .map((line, i) => (line.trim().startsWith('- ') ? i : -1))
    .filter((i) => i >= 0);

  if (bulletIndices.length <= max) return reply;

  const keep = new Set(bulletIndices.slice(0, max));
  const hiddenCount = bulletIndices.length - max;
  const kept = lines.filter((_, i) => keep.has(i) || !bulletIndices.includes(i));

  const lastLine = kept[kept.length - 1]?.trim() ?? '';
  if (!lastLine.endsWith('?')) {
    kept.push(
      `There ${hiddenCount === 1 ? 'is' : 'are'} ${hiddenCount} more matching — want me to narrow it down by price, body style, or mileage?`,
    );
  }

  return kept.join('\n');
}

export interface ChatDeps {
  checkRateLimit: (identifier: string, endpoint: string) => Promise<boolean>;
  store: ChatStore;
  getLiveVehicles: typeof getLiveVehicles;
  getChatCompletion: typeof getChatCompletion;
  createLead: (input: LeadInput) => Promise<{ id: string } | { error: string }>;
}

function defaultChatDeps(): ChatDeps {
  return {
    checkRateLimit,
    store: createChatStore(),
    getLiveVehicles,
    getChatCompletion,
    createLead,
  };
}

export async function POST(req: NextRequest) {
  try {
    return await handleChatPost(req, defaultChatDeps());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('[chat] UNHANDLED error in /api/chat:', stack || message);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}

export async function handleChatPost(req: NextRequest, deps: ChatDeps): Promise<NextResponse> {
  const json: unknown = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { message, vehicle_id, contact } = parsed.data;
  let sessionToken = parsed.data.session_token;

  const ip = clientIpFromHeaders(req.headers);
  const allowed = await deps.checkRateLimit(ip, 'chat');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many messages — please try again in a bit, or call us at (773) 350-0002.' },
      { status: 429 },
    );
  }

  // Find or create the chat session. The store uses the service role.
  // The anon key cannot read or update these tables.
  let session: { id: string; session_token: string; lead_id: string | null } | null = null;
  if (sessionToken) {
    session = await deps.store.findSession(sessionToken);
  }

  if (!session) {
    sessionToken = crypto.randomUUID();
    const created = await deps.store.createSession({
      companyId: DEALERSHIP_COMPANY_ID,
      sessionToken,
      vehicleId: vehicle_id || null,
    });
    if ('error' in created) {
      console.error('[chat] chat_sessions insert errored:', created.error);
      return NextResponse.json({ error: 'Could not start chat session.' }, { status: 500 });
    }
    session = created.session;
  }

  await deps.store.addMessage(session.id, 'user', message);

  // Capture the lead the moment we have name+phone+consent, regardless of
  // whether the AI call below succeeds — a lead shouldn't get lost just
  // because the model timed out.
  let leadId: string | null = session.lead_id ?? null;
  if (contact && !leadId) {
    const result = await deps.createLead({
      company_id: DEALERSHIP_COMPANY_ID,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      source: 'chat_agent',
      lead_score: 'warm',
      vehicle_id: vehicle_id || null,
      notes: `Captured via AI chat. Last message: ${message}`,
      consent: contact.consent,
    });
    if ('id' in result) {
      leadId = result.id;
      await deps.store.linkLead(session.id, leadId);
    } else {
      console.error('[chat] createLead errored:', result.error);
    }
  }

  let reply: string;
  try {
    const vehicles = await deps.getLiveVehicles();
    const systemPrompt = `You are the website chat assistant for MOTOR DEALS USA, a used car dealership. Answer only using the facts and inventory below. Keep replies short (2-4 sentences). If asked about a car not in this list, say we don't currently have it in stock. Always try to get the customer's name and phone number if you don't already have them, so the team can follow up.

When listing vehicles, put each one on its own line starting with "- ", formatted as "- {year} {make} {model} {trim} — \${price} — {miles} mi". List at most 5 vehicles at a time; if more match, mention there are more and ask a follow-up question (e.g. narrow by price or body style) instead of listing them all.

${DEALERSHIP_FACTS}

Current live inventory:
${formatInventorySnapshot(vehicles)}`;

    const history = await deps.store.recentMessages(session.id);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m): ChatMessage => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    reply = capVehicleList(await deps.getChatCompletion(messages));
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[chat] AI completion failed, falling back:', detail);
    return NextResponse.json(
      {
        session_token: sessionToken,
        reply:
          "Sorry, I'm having trouble answering right now. Please use our contact form and we'll get back to you shortly, or call (773) 350-0002.",
        fallback: true,
      },
      { status: 200 },
    );
  }

  await deps.store.addMessage(session.id, 'assistant', reply);

  return NextResponse.json({ session_token: sessionToken, reply, lead_captured: !!leadId });
}
