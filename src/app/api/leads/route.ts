import { NextRequest, NextResponse } from 'next/server';
import {
  leadRequestSchema,
  createLead,
  resolveLeadSource,
  PUBLIC_LEAD_MAX_PER_HOUR,
  STAFF_LEAD_MAX_PER_HOUR,
  type LeadInput,
} from '@/lib/leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { clientIpFromHeaders } from '@/lib/client-ip';
import { createClient } from '@/lib/supabase/server';

export interface LeadRouteDeps {
  getUser: () => Promise<{ id: string } | null>;
  checkRateLimit: (identifier: string, endpoint: string, max: number) => Promise<boolean>;
  createLead: (input: LeadInput) => Promise<{ id: string } | { error: string }>;
}

async function defaultGetUser(): Promise<{ id: string } | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[leads] auth lookup failed; treating request as public:', message);
    return null;
  }
}

function defaultDeps(): LeadRouteDeps {
  return { getUser: defaultGetUser, checkRateLimit, createLead };
}

export async function POST(req: NextRequest) {
  return postLead(req, defaultDeps());
}

export async function postLead(req: NextRequest, deps: LeadRouteDeps): Promise<NextResponse> {
  const json: unknown = await req.json().catch(() => null);
  const parsed = leadRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await deps.getUser();
  const source = resolveLeadSource(parsed.data.source, Boolean(user));
  if ('error' in source) {
    return NextResponse.json({ error: source.error }, { status: 400 });
  }

  const identifier = user ? `user:${user.id}` : clientIpFromHeaders(req.headers);
  const max = user ? STAFF_LEAD_MAX_PER_HOUR : PUBLIC_LEAD_MAX_PER_HOUR;
  const allowed = await deps.checkRateLimit(identifier, 'leads', max);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a bit, or call us at (773) 350-0002.' },
      { status: 429 },
    );
  }

  const result = await deps.createLead({
    ...parsed.data,
    company_id: source.company_id,
    source: source.source,
  });

  if ('error' in result) {
    if (result.error === 'Consent is required.') {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    console.error('[leads] create failed:', result.error);
    return NextResponse.json({ error: 'Could not save your request.' }, { status: 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
