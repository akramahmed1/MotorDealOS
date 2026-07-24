import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Only for server-side code that has
// already validated/authorized the operation itself (e.g. createLead() in
// src/lib/leads.ts, where Zod + an explicit consent check gate the insert,
// and there is no RLS shape that lets an anonymous inserter read back only
// the row it just created).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
