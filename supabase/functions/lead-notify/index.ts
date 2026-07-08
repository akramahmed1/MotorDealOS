// Fires on every INSERT into `leads` (via the leads_notify_owner DB trigger — see
// supabase/migrations-manual/lead-notify-trigger.sql). Sends an instant alert email
// to the owner. Never sends anything to the customer — internal notification only.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// INTENTIONAL interim state (see CLAUDE.md "Build order" 2.5d) — Resend sandbox mode
// only allows sending to the account's own signup email until a sending domain is
// verified (blocked on DNS access, managed via AutoFunds' Cloudflare account, tracked
// separately). Deployed to akramahmed1@gmail.com on purpose so real alerts are
// received somewhere during dev/testing. MUST redeploy to motordealsusa@gmail.com
// before real launch, once domain verification lands.
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

Deno.serve(async (req: Request) => {
  if (!RESEND_API_KEY) {
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

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
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
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, to: OWNER_EMAIL, status: resendResponse.status, resend: resendResponseText }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
