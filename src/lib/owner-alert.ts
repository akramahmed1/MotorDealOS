// Best-effort internal email. Never throws: the caller's own log row is the
// record if the alert cannot be sent. The anon key still has to be presented
// to the Supabase gateway; OWNER_ALERT_SECRET is what actually authorizes the
// function. This is a new shared secret, not a replacement for any API key.

export async function sendOwnerAlert(subject: string, message: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.OWNER_ALERT_SECRET;

  if (!base || !anon || !secret) {
    console.error(
      '[owner-alert] not sent: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or OWNER_ALERT_SECRET is unset'
    );
    return;
  }

  try {
    await fetch(`${base}/functions/v1/owner-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anon}`,
        'x-owner-alert-secret': secret,
      },
      body: JSON.stringify({ subject, message }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown error';
    console.error('[owner-alert] request failed:', detail);
  }
}
