import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEALERSHIP_COMPANY_ID } from '@/lib/site-config';

export const PUBLIC_LEAD_SOURCES = ['website'] as const;
export const STAFF_LEAD_SOURCES = ['facebook', 'instagram', 'tiktok', 'walkin', 'phone'] as const;
export const PUBLIC_LEAD_MAX_PER_HOUR = 10;
export const STAFF_LEAD_MAX_PER_HOUR = 60;

export const leadSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().email().optional().or(z.literal('')),
  source: z.enum([
    'website', 'cargurus', 'carfax', 'facebook', 'instagram', 'tiktok',
    'marketplace', 'export_form', 'sell_form', 'walkin', 'referral',
    'chat_agent', 'voice_agent', 'phone',
  ]),
  lead_score: z.enum(['hot', 'warm', 'cold']).default('warm'),
  vehicle_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  consent: z.boolean(),
});

export type LeadInput = z.infer<typeof leadSchema>;

// The HTTP route does not accept company_id. Clients still send it; Zod strips it.
export const leadRequestSchema = leadSchema.omit({ company_id: true });

const STAFF_OR_PUBLIC: readonly string[] = [...PUBLIC_LEAD_SOURCES, ...STAFF_LEAD_SOURCES];

function isAllowedSource(source: string, isStaff: boolean): source is LeadInput['source'] {
  const allowed: readonly string[] = isStaff ? STAFF_OR_PUBLIC : PUBLIC_LEAD_SOURCES;
  return allowed.includes(source);
}

// company_id is never taken from the caller. Public visitors may only file a
// website lead. Signed-in staff may also file the quick-add sources. System
// sources (cargurus, chat_agent, and the rest) are not set through this path.
export function resolveLeadSource(
  source: string,
  isStaff: boolean,
): { company_id: string; source: LeadInput['source'] } | { error: string } {
  if (!isAllowedSource(source, isStaff)) {
    return { error: 'That lead source is not allowed.' };
  }
  return { company_id: DEALERSHIP_COMPANY_ID, source };
}

export interface LeadWriter {
  from(table: 'leads'): {
    insert(row: Record<string, unknown>): {
      select(columns: 'id'): {
        single(): Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
}

function readId(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || !('id' in data)) return null;
  const id = data.id;
  return typeof id === 'string' ? id : null;
}

// Every lead-capture point must carry TCPA consent (CLAUDE.md Security rule 6).
// Owner alert emails are handled by the leads_notify_owner DB trigger
// (supabase/migrations-manual/lead-notify-trigger.sql) + lead-notify Edge
// Function on every insert — callers of this never send anything themselves.
//
// Uses the service-role client: there is no anon SELECT policy on `leads`
// (correctly — that would let anyone with the anon key read every customer's
// name and phone), and this function needs the new row's id. Zod and the
// consent check gate the insert. company_id is forced to this dealership
// even if a caller passes a different one.
export async function createLead(input: LeadInput, db?: LeadWriter): Promise<{ id: string } | { error: string }> {
  if (!input.consent) {
    return { error: 'Consent is required.' };
  }

  // The service-role client is the production writer. Tests pass their own LeadWriter.
  const supabase = db ?? (createAdminClient() as unknown as LeadWriter);
  const { data, error } = await supabase
    .from('leads')
    .insert({
      company_id: DEALERSHIP_COMPANY_ID,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source,
      lead_score: input.lead_score,
      vehicle_id: input.vehicle_id || null,
      notes: input.notes || null,
      status: 'new',
      source_metadata: { consent: true, consent_text_version: 'v1' },
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  const id = readId(data);
  if (!id) return { error: 'Lead was saved but its id was not returned.' };
  return { id };
}
