import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseAutofundsHtml, type ParsedAutofundsRow } from '@/lib/autofunds-parser';
import { sendOwnerAlert } from '@/lib/owner-alert';

const DEFAULT_LOT_LOCATION = 'main';

interface ExistingVehicle {
  id: string;
  vin: string;
  price: number | null;
  miles: number | null;
  color: string | null;
  status: string;
  updated_by: string | null;
}

async function logAndAlert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  message: string
) {
  await supabase.from('system_logs').insert({
    company_id: companyId,
    level: 'error',
    service: 'autofunds-import',
    message,
  });

  await sendOwnerAlert('AutoFunds import failed', message);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file');
  const confirm = formData.get('confirm') === 'true';
  const companyId = formData.get('companyId')?.toString();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const html = await file.text();
  const { rows: parsedRows, skipped } = parseAutofundsHtml(html);

  if (parsedRows.length === 0) {
    return NextResponse.json({ error: 'No valid vehicle rows found in this file' }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, vin, price, miles, color, status, updated_by')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (fetchError) {
    await logAndAlert(supabase, companyId, `Failed to fetch existing vehicles: ${fetchError.message}`);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existingByVin = new Map<string, ExistingVehicle>((existing || []).map((v) => [v.vin.toUpperCase(), v]));
  const importedVins = new Set(parsedRows.map((r) => r.vin));

  const toInsert: ParsedAutofundsRow[] = [];
  const toUpdate: { row: ParsedAutofundsRow; current: ExistingVehicle }[] = [];
  const conflicts: { row: ParsedAutofundsRow; current: ExistingVehicle }[] = [];

  for (const row of parsedRows) {
    const current = existingByVin.get(row.vin);
    if (!current) {
      toInsert.push(row);
      continue;
    }
    const changed = current.price !== row.price || current.miles !== row.miles || current.color !== row.color;
    if (!changed) continue;

    // Source-of-truth conflict rule (CLAUDE.md §4): a human has touched this vehicle
    // since the last import — flag for review instead of silently overwriting.
    if (current.updated_by) {
      conflicts.push({ row, current });
    } else {
      toUpdate.push({ row, current });
    }
  }

  const toMarkSold = (existing || []).filter(
    (v) => !importedVins.has(v.vin.toUpperCase()) && v.status !== 'sold'
  );

  const preview = {
    newCount: toInsert.length,
    updateCount: toUpdate.length,
    soldCount: toMarkSold.length,
    conflictCount: conflicts.length,
    skippedCount: skipped.length,
    updates: toUpdate.map((u) => ({
      vin: u.row.vin,
      priceFrom: u.current.price,
      priceTo: u.row.price,
      milesFrom: u.current.miles,
      milesTo: u.row.miles,
      colorFrom: u.current.color,
      colorTo: u.row.color,
    })),
    sold: toMarkSold.map((v) => ({ vin: v.vin })),
    conflicts: conflicts.map((c) => ({
      vin: c.row.vin,
      reason: 'Manually edited since last import — import would change price/miles/color',
      priceFrom: c.current.price,
      priceTo: c.row.price,
      milesFrom: c.current.miles,
      milesTo: c.row.miles,
    })),
    skipped,
  };

  if (!confirm) {
    return NextResponse.json({ preview });
  }

  let insertError: string | null = null;
  if (toInsert.length > 0) {
    const { error } = await supabase.from('vehicles').insert(
      toInsert.map((r) => ({
        company_id: companyId,
        vin: r.vin,
        year: r.year,
        make: r.make,
        model: r.model,
        trim: r.trim,
        color: r.color,
        miles: r.miles,
        price: r.price,
        status: 'live',
        lot_location: DEFAULT_LOT_LOCATION,
        // Explicitly null — distinguishes system-imported rows from human edits (see conflict rule above).
        created_by: null,
        updated_by: null,
      }))
    );
    if (error) insertError = error.message;
  }

  const updateErrors: string[] = [];
  for (const { row, current } of toUpdate) {
    const { error } = await supabase
      .from('vehicles')
      .update({ price: row.price, miles: row.miles, color: row.color, updated_by: null })
      .eq('id', current.id);
    if (error) updateErrors.push(`${row.vin}: ${error.message}`);
  }

  const soldErrors: string[] = [];
  for (const v of toMarkSold) {
    const { error } = await supabase.from('vehicles').update({ status: 'sold' }).eq('id', v.id);
    if (error) soldErrors.push(`${v.vin}: ${error.message}`);
  }

  if (insertError || updateErrors.length > 0 || soldErrors.length > 0) {
    const message = [
      insertError ? `Insert failed: ${insertError}` : null,
      ...updateErrors.map((e) => `Update failed: ${e}`),
      ...soldErrors.map((e) => `Mark-sold failed: ${e}`),
    ]
      .filter(Boolean)
      .join('\n');
    await logAndAlert(supabase, companyId, message);
    return NextResponse.json({ error: message, preview }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: toInsert.length,
    updated: toUpdate.length,
    markedSold: toMarkSold.length,
    conflicts: conflicts.length,
  });
}
