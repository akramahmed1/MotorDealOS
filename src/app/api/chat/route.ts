import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getChatCompletion, type ChatMessage } from '@/lib/ai';
import { checkRateLimit } from '@/lib/rate-limit';
import { createLead } from '@/lib/leads';
import { getLiveVehicles } from '@/lib/vehicles';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

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

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { message, vehicle_id, contact } = parsed.data;
  let sessionToken = parsed.data.session_token;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const allowed = await checkRateLimit(ip, 'chat');
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many messages — please try again in a bit, or call us at (773) 350-0002.' },
      { status: 429 }
    );
  }

  const supabase = await createClient();

  // Find or create the chat session.
  let session = sessionToken
    ? (await supabase.from('chat_sessions').select('id, session_token, lead_id').eq('session_token', sessionToken).maybeSingle()).data
    : null;

  if (!session) {
    sessionToken = crypto.randomUUID();
    const { data: newSession, error: sessionError } = await supabase
      .from('chat_sessions')
      .insert({
        company_id: COMPANY_ID,
        session_token: sessionToken,
        source: 'chat_widget',
        status: 'open',
        vehicle_id: vehicle_id || null,
      })
      .select('id, session_token, lead_id')
      .single();

    if (sessionError) {
      return NextResponse.json({ error: 'Could not start chat session.' }, { status: 500 });
    }
    session = newSession;
  }

  await supabase.from('chat_messages').insert({
    session_id: session.id,
    role: 'user',
    content: message,
  });

  // Capture the lead the moment we have name+phone+consent, regardless of
  // whether the AI call below succeeds — a lead shouldn't get lost just
  // because the model timed out.
  let leadId: string | null = session.lead_id ?? null;
  if (contact && !leadId) {
    const result = await createLead({
      company_id: COMPANY_ID,
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
      await supabase.from('chat_sessions').update({ lead_id: leadId }).eq('id', session.id);
    }
  }

  let reply: string;
  try {
    const vehicles = await getLiveVehicles();
    const systemPrompt = `You are the website chat assistant for MOTOR DEALS USA, a used car dealership. Answer only using the facts and inventory below. Keep replies short (2-4 sentences). If asked about a car not in this list, say we don't currently have it in stock. Always try to get the customer's name and phone number if you don't already have them, so the team can follow up.

${DEALERSHIP_FACTS}

Current live inventory:
${formatInventorySnapshot(vehicles)}`;

    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .limit(20);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    reply = await getChatCompletion(messages);
  } catch (err) {
    console.error('[chat] AI completion failed, falling back:', (err as Error).message);
    return NextResponse.json(
      {
        session_token: sessionToken,
        reply:
          "Sorry, I'm having trouble answering right now. Please use our contact form and we'll get back to you shortly, or call (773) 350-0002.",
        fallback: true,
      },
      { status: 200 }
    );
  }

  await supabase.from('chat_messages').insert({
    session_id: session.id,
    role: 'assistant',
    content: reply,
  });

  return NextResponse.json({ session_token: sessionToken, reply, lead_captured: !!leadId });
}
