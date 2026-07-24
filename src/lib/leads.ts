import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

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

// Every lead-capture point must carry TCPA consent (CLAUDE.md Security rule 6).
// Owner alert emails are handled entirely by the leads_notify_owner DB trigger
// (supabase/migrations-manual/lead-notify-trigger.sql) + lead-notify Edge
// Function on every insert — callers of this never send anything themselves.
//
// Uses the service-role client rather than the anon-key one: there's no anon
// SELECT policy on `leads` (correctly — that would let anyone with the anon
// key read every customer's name/phone/notes), but this function needs to
// read back the new row's id. Since Zod (leadSchema) and the consent check
// above already gate what can be inserted, the service role here is doing
// authorized work, not bypassing a check that should have run.
export async function createLead(input: LeadInput): Promise<{ id: string } | { error: string }> {
  if (!input.consent) {
    return { error: 'Consent is required.' };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      company_id: input.company_id,
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

  if (error) {
    return { error: error.message };
  }

  return { id: data.id };
}
