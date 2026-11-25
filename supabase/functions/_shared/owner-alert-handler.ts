import { rejectIfUnauthed } from './internal-auth.ts';

// Same mailbox as before (CLAUDE.md 2.5d). Not changed here.
const OWNER_EMAIL = 'akramahmed1@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';

export async function handleOwnerAlert(
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

  let payload: { subject?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.subject || !payload.message) {
    return new Response('subject and message are required', { status: 400 });
  }

  const resendResponse = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
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
    { status: resendResponse.ok ? 200 : 502, headers: { 'Content-Type': 'application/json' } },
  );
}
