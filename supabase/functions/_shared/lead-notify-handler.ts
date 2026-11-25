import { rejectIfUnauthed } from './internal-auth.ts';

// Same mailbox as before (CLAUDE.md 2.5d). Not changed here.
const OWNER_EMAIL = 'akramahmed1@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';

interface LeadRecord {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  notes: string | null;
  vehicle_id: string | null;
  created_at: string;
}

interface DatabaseWebhookPayload {
  type: 'INSERT';
  table: string;
  record: LeadRecord;
  schema: string;
}

export async function handleLeadNotify(
  req: Request,
  env: { secret: string | undefined; resendKey: string | undefined },
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const denied = rejectIfUnauthed(req, env.secret);
  if (denied) return denied;

  if (!env.resendKey) {
    console.error('Missing RESEND_API_KEY secret');
    return new Response('Server misconfigured', { status: 500 });
  }

  let payload: DatabaseWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (payload.type !== 'INSERT' || payload.table !== 'leads') {
    return new Response('Ignored', { status: 200 });
  }

  const lead = payload.record;

  const subject = `New lead: ${lead.name || 'Unknown'} (${lead.source})`;
  const body = [
    `New lead received.`,
    ``,
    `Name: ${lead.name || '(not provided)'}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email || '(not provided)'}`,
    `Source: ${lead.source}`,
    `Status: ${lead.status}`,
    `Notes: ${lead.notes || '(none)'}`,
    `Vehicle ID: ${lead.vehicle_id || '(none)'}`,
    `Received: ${lead.created_at}`,
  ].join('\n');

  const resendResponse = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject,
      text: body,
    }),
  });

  const resendResponseText = await resendResponse.text();
  console.log('Resend send:', { to: OWNER_EMAIL, status: resendResponse.status, body: resendResponseText });

  if (!resendResponse.ok) {
    return new Response(
      JSON.stringify({ ok: false, to: OWNER_EMAIL, status: resendResponse.status, resend: resendResponseText }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, to: OWNER_EMAIL, status: resendResponse.status, resend: resendResponseText }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
