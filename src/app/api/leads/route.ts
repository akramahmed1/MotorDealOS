import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const leadSchema = z.object({
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

// Every lead-capture point must carry TCPA consent (CLAUDE.md Security rule 6).
// Owner alert emails are handled entirely by the leads_notify_owner DB trigger
// (supabase/migrations-manual/lead-notify-trigger.sql) + lead-notify Edge
// Function on every insert — this route does not send anything itself.
export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { consent, ...rest } = parsed.data;
  if (!consent) {
    return NextResponse.json({ error: 'Consent is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...rest,
      email: rest.email || null,
      notes: rest.notes || null,
      vehicle_id: rest.vehicle_id || null,
      status: 'new',
      source_metadata: { consent: true, consent_text_version: 'v1' },
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
