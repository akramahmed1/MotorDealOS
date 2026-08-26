import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { toCsv } from '@/lib/csv';

// CLAUDE.md Task 7 (launch-readiness pack): weekly cron export of
// vehicles+leads CSVs to Supabase Storage, keeping the last 8. Requires a
// private "exports" bucket to exist — see docs/setup for the one-time SQL.
export const EXPORT_BUCKET = 'exports';
const KEEP_COUNT = 8;
// Matches the hardcoded single-tenant company_id used elsewhere (see src/app/api/chat/route.ts
// and the dashboard/public pages) — this app is single-tenant today despite the multi-tenant schema.
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

const VEHICLE_COLUMNS = [
  'id', 'company_id', 'vin', 'year', 'make', 'model', 'trim', 'color',
  'body_style', 'miles', 'price', 'status', 'acquisition_cost',
  'total_cost_basis', 'profit_projection', 'created_at', 'updated_at',
] as const;

const LEAD_COLUMNS = [
  'id', 'company_id', 'name', 'phone', 'email', 'source', 'status',
  'lead_score', 'notes', 'created_at', 'updated_at',
] as const;

async function pruneOldExports(
  supabase: ReturnType<typeof createAdminClient>,
  folder: string
) {
  const { data: files, error } = await supabase.storage.from(EXPORT_BUCKET).list(folder, {
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error || !files) return;

  const stale = files.slice(KEEP_COUNT);
  if (stale.length > 0) {
    await supabase.storage.from(EXPORT_BUCKET).remove(stale.map((f) => `${folder}/${f.name}`));
  }
}

async function logResult(
  supabase: ReturnType<typeof createAdminClient>,
  level: 'info' | 'error',
  message: string
) {
  await supabase.from('system_logs').insert({
    company_id: COMPANY_ID,
    level,
    service: 'weekly-csv-export',
    message,
  });

  if (level === 'error') {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/owner-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ subject: 'Weekly CSV export failed', message }),
      });
    } catch {
      // best-effort — the system_logs row is the source of truth if the alert itself fails
    }
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends this header automatically when CRON_SECRET is set; also
  // lets you trigger it manually (e.g. from a preview) with the same header.
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const [{ data: vehicles, error: vehiclesError }, { data: leads, error: leadsError }] = await Promise.all([
    supabase.from('vehicles').select(VEHICLE_COLUMNS.join(',')).eq('company_id', COMPANY_ID).is('deleted_at', null),
    supabase.from('leads').select(LEAD_COLUMNS.join(',')).eq('company_id', COMPANY_ID).is('deleted_at', null),
  ]);

  if (vehiclesError || leadsError) {
    const message = [
      vehiclesError ? `vehicles query failed: ${vehiclesError.message}` : null,
      leadsError ? `leads query failed: ${leadsError.message}` : null,
    ].filter(Boolean).join('\n');
    await logResult(supabase, 'error', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const vehiclesCsv = toCsv(
    (vehicles ?? []) as unknown as Record<string, unknown>[],
    VEHICLE_COLUMNS as unknown as string[]
  );
  const leadsCsv = toCsv(
    (leads ?? []) as unknown as Record<string, unknown>[],
    LEAD_COLUMNS as unknown as string[]
  );

  const [vehiclesUpload, leadsUpload] = await Promise.all([
    supabase.storage.from(EXPORT_BUCKET).upload(`vehicles/${timestamp}.csv`, vehiclesCsv, {
      contentType: 'text/csv',
    }),
    supabase.storage.from(EXPORT_BUCKET).upload(`leads/${timestamp}.csv`, leadsCsv, {
      contentType: 'text/csv',
    }),
  ]);

  if (vehiclesUpload.error || leadsUpload.error) {
    const message = [
      vehiclesUpload.error ? `vehicles upload failed: ${vehiclesUpload.error.message}` : null,
      leadsUpload.error ? `leads upload failed: ${leadsUpload.error.message}` : null,
    ].filter(Boolean).join('\n');
    await logResult(supabase, 'error', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await Promise.all([pruneOldExports(supabase, 'vehicles'), pruneOldExports(supabase, 'leads')]);

  await logResult(
    supabase,
    'info',
    `Exported ${vehicles?.length ?? 0} vehicles and ${leads?.length ?? 0} leads to ${EXPORT_BUCKET}/`
  );

  return NextResponse.json({
    ok: true,
    vehiclesExported: vehicles?.length ?? 0,
    leadsExported: leads?.length ?? 0,
  });
}
