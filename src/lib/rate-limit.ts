import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const CHAT_MAX_PER_HOUR = 20;

// Per-IP (or per-staff-user) counters in `rate_limits`. The anon key used to
// be able to read and reset these rows, which made the cap optional. Reads
// and writes go through the service role now. If the check itself errors,
// the request is refused (fail closed) so a broken limiter cannot be used
// as a way around the cap.
//
// Live table shape confirmed 2026-07-21 in supabase/sql/2026-07-11-rate-limits-check.sql:
// ip_address, endpoint, request_count, window_start, id. No company_id column.

export interface RateLimitRow {
  id: string;
  request_count: number;
}

export interface RateLimitStore {
  find(ip: string, endpoint: string, windowStartIso: string): Promise<RateLimitRow | null>;
  insert(ip: string, endpoint: string, windowStartIso: string): Promise<void>;
  increment(id: string, nextCount: number): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRow(data: unknown): RateLimitRow | null {
  if (!isRecord(data)) return null;
  if (typeof data.id !== 'string' || typeof data.request_count !== 'number') return null;
  return { id: data.id, request_count: data.request_count };
}

function errorMessage(error: unknown): string | null {
  if (!isRecord(error) || typeof error.message !== 'string') return null;
  return error.message;
}

function adminStore(): RateLimitStore {
  const supabase = createAdminClient();
  return {
    async find(ip, endpoint, windowStartIso) {
      const result = await supabase
        .from('rate_limits')
        .select('id, request_count, window_start')
        .eq('ip_address', ip)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStartIso)
        .order('window_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      const message = errorMessage(result.error);
      if (message) throw new Error(message);
      return readRow(result.data);
    },
    async insert(ip, endpoint, windowStartIso) {
      const result = await supabase.from('rate_limits').insert({
        ip_address: ip,
        endpoint,
        request_count: 1,
        window_start: windowStartIso,
      });
      const message = errorMessage(result.error);
      if (message) throw new Error(message);
    },
    async increment(id, nextCount) {
      const result = await supabase.from('rate_limits').update({ request_count: nextCount }).eq('id', id);
      const message = errorMessage(result.error);
      if (message) throw new Error(message);
    },
  };
}

export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxPerWindow = CHAT_MAX_PER_HOUR,
  store?: RateLimitStore,
): Promise<boolean> {
  try {
    const db = store ?? adminStore();
    const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();
    const existing = await db.find(identifier, endpoint, windowStart);

    if (!existing) {
      await db.insert(identifier, endpoint, new Date().toISOString());
      return true;
    }

    if (existing.request_count >= maxPerWindow) return false;

    await db.increment(existing.id, existing.request_count + 1);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[rate-limit] FAILING CLOSED — rate_limits check errored: ${message}`);
    return false;
  }
}
