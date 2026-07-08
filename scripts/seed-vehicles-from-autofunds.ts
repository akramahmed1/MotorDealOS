// LOCAL USE ONLY — requires SUPABASE_SERVICE_ROLE_KEY, never deploy or run in CI.
//
// Parses docs/autofunds-sample.xls (an HTML table saved with a .xls extension — see
// SKILLS.md Skill 1) and upserts vehicles into the `vehicles` table, keyed by VIN.
//
// Usage:
//   npx tsx scripts/seed-vehicles-from-autofunds.ts            # dry run, prints preview only
//   npx tsx scripts/seed-vehicles-from-autofunds.ts --confirm  # actually writes to the database

import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local') });
import { createClient } from '@supabase/supabase-js';
import { parseAutofundsHtml } from '../src/lib/autofunds-parser';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_LOT_LOCATION = 'main';

async function main() {
  const confirm = process.argv.includes('--confirm');
  const filePath = resolve(process.cwd(), 'docs/autofunds-sample.xls');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. This script requires the service role key to bypass RLS for bulk import — never commit it.'
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey);
  const html = readFileSync(filePath, 'utf-8');
  const { rows: parsedRows, skipped } = parseAutofundsHtml(html);
  console.log(`Parsed ${parsedRows.length} vehicles from ${filePath}`);
  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} row(s):`);
    for (const s of skipped) console.warn(`  row ${s.rowNumber}: ${s.reason}`);
  }

  const { data: existing, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, vin, price, miles, color, status')
    .is('deleted_at', null);

  if (fetchError) {
    console.error('Failed to fetch existing vehicles:', fetchError.message);
    process.exit(1);
  }

  const existingByVin = new Map((existing || []).map((v) => [v.vin.toUpperCase(), v]));
  const importedVins = new Set(parsedRows.map((r) => r.vin));

  const toInsert = parsedRows.filter((r) => !existingByVin.has(r.vin));
  const toUpdate = parsedRows.filter((r) => {
    const current = existingByVin.get(r.vin);
    if (!current) return false;
    return current.price !== r.price || current.miles !== r.miles || current.color !== r.color;
  });
  const toMarkSold = (existing || []).filter(
    (v) => !importedVins.has(v.vin.toUpperCase()) && v.status !== 'sold'
  );

  console.log('\n--- Preview ---');
  console.log(`${toInsert.length} new vehicles to insert`);
  console.log(`${toUpdate.length} vehicles to update (price/miles/color changed)`);
  for (const r of toUpdate) {
    const current = existingByVin.get(r.vin)!;
    console.log(`  ${r.vin}: price ${current.price} -> ${r.price}, miles ${current.miles} -> ${r.miles}, color ${current.color} -> ${r.color}`);
  }
  console.log(`${toMarkSold.length} vehicles to mark sold (in DB but no longer in export)`);
  for (const v of toMarkSold) {
    console.log(`  ${v.vin}: status ${v.status} -> sold`);
  }

  if (!confirm) {
    console.log('\nDry run only. Re-run with --confirm to write these changes.');
    return;
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('vehicles').insert(
      toInsert.map((r) => ({
        company_id: COMPANY_ID,
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
      }))
    );
    if (error) console.error('Insert failed:', error.message);
    else console.log(`Inserted ${toInsert.length} vehicles.`);
  }

  for (const r of toUpdate) {
    const current = existingByVin.get(r.vin)!;
    const { error } = await supabase
      .from('vehicles')
      .update({ price: r.price, miles: r.miles, color: r.color })
      .eq('id', current.id);
    if (error) console.error(`Update failed for ${r.vin}:`, error.message);
  }
  if (toUpdate.length > 0) console.log(`Updated ${toUpdate.length} vehicles.`);

  for (const v of toMarkSold) {
    const { error } = await supabase.from('vehicles').update({ status: 'sold' }).eq('id', v.id);
    if (error) console.error(`Mark-sold failed for ${v.vin}:`, error.message);
  }
  if (toMarkSold.length > 0) console.log(`Marked ${toMarkSold.length} vehicles sold.`);

  console.log('\nDone.');
}

main();
