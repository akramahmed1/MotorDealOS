import { NextRequest, NextResponse } from 'next/server';
import { leadSchema, createLead } from '@/lib/leads';

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = leadSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createLead(parsed.data);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === 'Consent is required.' ? 400 : 500 });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}
