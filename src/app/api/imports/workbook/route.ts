import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendOwnerAlert } from '@/lib/owner-alert';
import {
  parseWorkbook,
  SOURCE_MAP,
  STATUS_MAP,
  COST_CATEGORY_MAP,
  type ParsedLeadRow,
  type ParsedCostingRow,
  type ParsedArbitrationRow,
} from '@/lib/workbook-parser';

interface VehicleLite {
  id: string;
  vin: string;
  acquisition_cost: number | null;
  transport_cost: number | null;
  inspection_cost: number | null;
  service_cost: number | null;
  wash_cost: number | null;
  detail_cost: number | null;
  garage_cost: number | null;
  marketing_cost: number | null;
  metadata: Record<string, unknown> | null;
}

function resolveVin6(vin6: string | null, byVin6: Map<string, VehicleLite[]>) {
  if (!vin6) return { vehicle: null, reason: 'No VIN6 provided' };
  const matches = byVin6.get(vin6.toUpperCase()) || [];
  if (matches.length === 0) return { vehicle: null, reason: `VIN6 "${vin6}" matches no vehicle` };
  if (matches.length > 1)
    return { vehicle: null, reason: `VIN6 "${vin6}" matches ${matches.length} vehicles — ambiguous` };
  return { vehicle: matches[0], reason: null };
}

async function logAndAlert(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string, message: string) {
  await supabase.from('system_logs').insert({
    company_id: companyId,
    level: 'error',
    service: 'workbook-import',
    message,
  });
  await sendOwnerAlert('Workbook import failed', message);
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

  if (!(file instanceof File)) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  let parsed;
  try {
    parsed = parseWorkbook(buffer);
  } catch (e) {
    return NextResponse.json({ error: `Could not parse workbook: ${(e as Error).message}` }, { status: 400 });
  }

  const { data: vehicles, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, vin, acquisition_cost, transport_cost, inspection_cost, service_cost, wash_cost, detail_cost, garage_cost, marketing_cost, metadata')
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (fetchError) {
    await logAndAlert(supabase, companyId, `Failed to fetch vehicles: ${fetchError.message}`);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const byVin6 = new Map<string, VehicleLite[]>();
  for (const v of (vehicles as VehicleLite[]) || []) {
    const key = v.vin.slice(-6).toUpperCase();
    if (!byVin6.has(key)) byVin6.set(key, []);
    byVin6.get(key)!.push(v);
  }

  // --- LEADS ---
  const leadsToInsert: { row: ParsedLeadRow; vehicleId: string | null; source: string; status: string; lostReason: string | null }[] = [];
  const leadsNeedsReview: { rowNumber: number; reason: string }[] = [];

  for (const row of parsed.leads) {
    const { vehicle, reason } = resolveVin6(row.vin6, byVin6);
    if (reason) {
      leadsNeedsReview.push({ rowNumber: row.rowNumber, reason });
      continue;
    }
    const sourceKey = row.sourceRaw?.toLowerCase() ?? '';
    const source = SOURCE_MAP[sourceKey];
    if (!source) {
      leadsNeedsReview.push({ rowNumber: row.rowNumber, reason: `Unmapped source "${row.sourceRaw}"` });
      continue;
    }
    const statusKey = row.statusRaw?.toLowerCase() ?? '';
    const status = STATUS_MAP[statusKey];
    if (!status) {
      leadsNeedsReview.push({ rowNumber: row.rowNumber, reason: `Unmapped status "${row.statusRaw}"` });
      continue;
    }
    if (!row.date) {
      // Only flag if the raw date text existed but was ambiguous/unparseable.
      leadsNeedsReview.push({ rowNumber: row.rowNumber, reason: 'Date missing or ambiguous' });
      continue;
    }
    const lostReason = statusKey.startsWith('lost') ? row.statusRaw : null;
    leadsToInsert.push({ row, vehicleId: vehicle!.id, source, status, lostReason });
  }

  // --- COSTING ---
  const costingByVehicle = new Map<string, { vehicle: VehicleLite; deltas: Record<string, number>; notes: string[] }>();
  const costingNeedsReview: { rowNumber: number; reason: string }[] = [];

  for (const row of parsed.costing) {
    const { vehicle, reason } = resolveVin6(row.vin6, byVin6);
    if (reason) {
      costingNeedsReview.push({ rowNumber: row.rowNumber, reason });
      continue;
    }
    const categoryKey = row.category?.toLowerCase() ?? '';
    const mapping = COST_CATEGORY_MAP[categoryKey];
    if (!mapping) {
      costingNeedsReview.push({ rowNumber: row.rowNumber, reason: `Unmapped category "${row.category}"` });
      continue;
    }
    if (row.amount == null) {
      costingNeedsReview.push({ rowNumber: row.rowNumber, reason: 'Missing amount' });
      continue;
    }
    const entry = costingByVehicle.get(vehicle!.id) || { vehicle: vehicle!, deltas: {}, notes: [] };
    entry.deltas[mapping.column] = (entry.deltas[mapping.column] || 0) + row.amount;
    if (mapping.note) entry.notes.push(`${mapping.note}: $${row.amount} (${row.item || 'no description'})`);
    costingByVehicle.set(vehicle!.id, entry);
  }

  // --- ARBITRATION-TRANSPORT ---
  const arbitrationByVehicle = new Map<string, { vehicle: VehicleLite; patch: Record<string, unknown> }>();
  const arbitrationNeedsReview: { rowNumber: number; reason: string }[] = [];

  for (const row of parsed.arbitration) {
    const { vehicle, reason } = resolveVin6(row.vin6, byVin6);
    if (reason) {
      arbitrationNeedsReview.push({ rowNumber: row.rowNumber, reason });
      continue;
    }
    arbitrationByVehicle.set(vehicle!.id, {
      vehicle: vehicle!,
      patch: {
        purchase_date: row.purchaseDate?.toISOString() ?? null,
        auction: row.auction,
        transport_status: row.transportStatus,
        pickup_date: row.pickupDate?.toISOString() ?? null,
        delivered_date: row.deliveredDate?.toISOString() ?? null,
        issue_found: row.issueFound,
        status_notes: row.statusNotes,
      },
    });
  }

  const preview = {
    leads: {
      toInsertCount: leadsToInsert.length,
      toInsert: leadsToInsert.map((l) => ({
        rowNumber: l.row.rowNumber,
        customerName: l.row.customerName,
        phone: l.row.phone,
        source: l.source,
        status: l.status,
        vin6: l.row.vin6,
      })),
      needsReview: leadsNeedsReview,
    },
    costing: {
      vehicleCount: costingByVehicle.size,
      updates: [...costingByVehicle.values()].map((e) => ({
        vin: e.vehicle.vin,
        deltas: e.deltas,
        notes: e.notes,
      })),
      needsReview: costingNeedsReview,
    },
    arbitration: {
      vehicleCount: arbitrationByVehicle.size,
      updates: [...arbitrationByVehicle.values()].map((e) => ({ vin: e.vehicle.vin, patch: e.patch })),
      needsReview: arbitrationNeedsReview,
    },
  };

  if (!confirm) return NextResponse.json({ preview });

  const errors: string[] = [];

  if (leadsToInsert.length > 0) {
    const { error } = await supabase.from('leads').insert(
      leadsToInsert.map((l) => ({
        company_id: companyId,
        name: l.row.customerName,
        phone: l.row.phone,
        source: l.source,
        status: l.status,
        vehicle_id: l.vehicleId,
        lead_score: 'warm',
        notes: l.row.notes,
        source_metadata: {
          salesperson: l.row.salesperson,
          next_action: l.row.nextAction,
          lost_reason: l.lostReason,
          imported_from: 'team_workbook',
        },
      }))
    );
    if (error) errors.push(`Leads insert failed: ${error.message}`);
  }

  for (const entry of costingByVehicle.values()) {
    const updatePayload: Record<string, number> = {};
    for (const [col, delta] of Object.entries(entry.deltas)) {
      const current = (entry.vehicle as unknown as Record<string, number | null>)[col] ?? 0;
      updatePayload[col] = current + delta;
    }
    const { error } = await supabase.from('vehicles').update(updatePayload).eq('id', entry.vehicle.id);
    if (error) errors.push(`Costing update failed for ${entry.vehicle.vin}: ${error.message}`);
  }

  for (const entry of arbitrationByVehicle.values()) {
    const newMetadata = { ...(entry.vehicle.metadata || {}), arbitration: entry.patch };
    const { error } = await supabase.from('vehicles').update({ metadata: newMetadata }).eq('id', entry.vehicle.id);
    if (error) errors.push(`Arbitration update failed for ${entry.vehicle.vin}: ${error.message}`);
  }

  if (errors.length > 0) {
    const message = errors.join('\n');
    await logAndAlert(supabase, companyId, message);
    return NextResponse.json({ error: message, preview }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    leadsInserted: leadsToInsert.length,
    vehiclesCostUpdated: costingByVehicle.size,
    vehiclesArbitrationUpdated: arbitrationByVehicle.size,
  });
}
