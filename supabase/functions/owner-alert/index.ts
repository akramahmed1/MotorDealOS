// Generic owner-alert email sender, reusing the RESEND_API_KEY secret already configured
// for lead-notify. Callers POST { subject, message }. Internal-only notification —
// never sends anything to a customer.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// INTENTIONAL interim state (see CLAUDE.md "Build order" 2.5d) — same reasoning as
// lead-notify: Resend sandbox mode only allows sending to the account's own signup
// email until a sending domain is verified. MUST redeploy to motordealsusa@gmail.com
// before real launch, once domain verification lands.
const OWNER_EMAIL = 'akramahmed1@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';

Deno.serve(async (req: Request) => {
  if (!RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY secret');
    return new Response('Server misconfigured', { status: 500 });
  }

  let payload: { subject?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.subject || !payload.message) {
    return new Response('subject and message are required', { status: 400 });
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      subject: payload.subject,
      text: payload.message,
    }),
  });

  const resendResponseText = await resendResponse.text();
  console.log('Resend send:', { to: OWNER_EMAIL, status: resendResponse.status, body: resendResponseText });

  return new Response(
    JSON.stringify({ ok: resendResponse.ok, to: OWNER_EMAIL, status: resendResponse.status }),
    { status: resendResponse.ok ? 200 : 502, headers: { 'Content-Type': 'application/json' } }
  );
});
