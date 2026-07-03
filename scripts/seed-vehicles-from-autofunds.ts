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
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_LOT_LOCATION = 'main';

interface ParsedRow {
  vin: string;
  year: number | null;
  make: string;
  model: string | null;
  trim: string | null;
  color: string | null;
  miles: number | null;
  price: number | null;
}

// Known acronym makes AutoFunds already formats correctly — title-casing would mangle these
// (e.g. "BMW" -> "Bmw"), so preserve the source casing for exact matches.
const ACRONYM_MAKES = new Set(['BMW', 'GMC', 'RAM', 'MINI']);

function titleCase(input: string): string {
  const trimmed = input.trim();
  if (ACRONYM_MAKES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();

  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMc(\w)/g, (_, c) => `Mc${c.toUpperCase()}`);
}

function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseAutofundsFile(filePath: string): ParsedRow[] {
  const html = readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html);

  const rows = $('table#invetoryListDataGrid tr, table tr');
  const headerCells = rows.first().find('td');
  const headers = headerCells.toArray().map((el) => $(el).text().trim());

  const colIndex = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const idx = {
    year: colIndex('Year'),
    make: colIndex('Make'),
    model: colIndex('Model'),
    trim: colIndex('Trim'),
    color: colIndex('Color'),
    mileage: colIndex('Mileage'),
    vin: colIndex('Vin'),
    internetPrice: colIndex('Internet Price'),
  };

  const parsed: ParsedRow[] = [];

  rows.slice(1).each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;
    const cellText = (i: number) => (i >= 0 ? $(cells[i]).text().trim() : '');

    const make = cellText(idx.make);
    // Drop summary rows (Total / Average): AutoFunds leaves Make empty on those.
    if (!make || make === '&nbsp;') return;

    const vin = cellText(idx.vin);
    if (vin.length !== 17) {
      console.warn(`Skipping row with invalid VIN length: "${vin}"`);
      return;
    }

    parsed.push({
      vin: vin.toUpperCase(),
      year: parseNumber(cellText(idx.year)),
      make: titleCase(make),
      model: cellText(idx.model) || null,
      trim: cellText(idx.trim) || null,
      color: cellText(idx.color) ? titleCase(cellText(idx.color)) : null,
      miles: parseNumber(cellText(idx.mileage)),
      price: parseNumber(cellText(idx.internetPrice)),
    });
  });

  return parsed;
}

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
  const parsedRows = parseAutofundsFile(filePath);
  console.log(`Parsed ${parsedRows.length} vehicles from ${filePath}`);

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
