import { createClient } from '@/lib/supabase/server';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 20;

// Per-IP rate limiting via `rate_limits` (CLAUDE.md: "per-IP rate limiting via
// rate_limits"), not per-session — an abusive actor can mint new sessions far
// more easily than new IPs.
//
// FAILS OPEN: if this check errors (schema mismatch, connection issue), chat
// stays usable rather than going down entirely — but that means the abuse cap
// silently stops working, so any failure here is logged loudly (console.error)
// rather than swallowed, so it surfaces in Vercel logs immediately instead of
// going unnoticed. The exact shape of `rate_limits` wasn't visible in the
// schema snapshot at build time — assumed columns: identifier, endpoint,
// request_count, window_start. See supabase/sql/2026-07-11-rate-limits-check.sql
// to confirm/adjust against the live table.
export async function checkRateLimit(identifier: string, endpoint: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

    const { data: existing, error: selectError } = await supabase
      .from('rate_limits')
      .select('id, request_count, window_start')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart)
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error(
        `[rate-limit] FAILING OPEN — select against rate_limits errored (schema mismatch? see supabase/sql/2026-07-11-rate-limits-check.sql): ${selectError.message}`
      );
      return true;
    }

    if (!existing) {
      const { error: insertError } = await supabase.from('rate_limits').insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString(),
      });
      if (insertError) {
        console.error(`[rate-limit] FAILING OPEN — insert into rate_limits errored: ${insertError.message}`);
      }
      return true;
    }

    if (existing.request_count >= MAX_REQUESTS_PER_WINDOW) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);

    if (updateError) {
      console.error(`[rate-limit] FAILING OPEN — update against rate_limits errored: ${updateError.message}`);
    }

    return true;
  } catch (err) {
    console.error(
      `[rate-limit] FAILING OPEN — unexpected error checking rate_limits (verify table/columns exist): ${(err as Error).message}`
    );
    return true;
  }
}
