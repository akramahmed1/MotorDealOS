import * as cheerio from 'cheerio';

// Parses an AutoFunds inventory export — an HTML table saved with a .xls extension
// (see SKILLS.md Skill 1). Shared by scripts/seed-vehicles-from-autofunds.ts and the
// admin import route so the parsing/normalization logic never drifts between the two.

export interface ParsedAutofundsRow {
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

export function titleCase(input: string): string {
  const trimmed = input.trim();
  if (ACRONYM_MAKES.has(trimmed.toUpperCase())) return trimmed.toUpperCase();

  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bMc(\w)/g, (_, c) => `Mc${c.toUpperCase()}`);
}

export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface ParseAutofundsResult {
  rows: ParsedAutofundsRow[];
  skipped: { rowNumber: number; vin: string; reason: string }[];
}

export function parseAutofundsHtml(html: string): ParseAutofundsResult {
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

  const parsed: ParsedAutofundsRow[] = [];
  const skipped: { rowNumber: number; vin: string; reason: string }[] = [];

  rows.slice(1).each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) return;
    const cellText = (i: number) => (i >= 0 ? $(cells[i]).text().trim() : '');

    const make = cellText(idx.make);
    // Drop summary rows (Total / Average): AutoFunds leaves Make empty on those.
    // Not "skipped" in the reported sense — these are expected, non-vehicle rows.
    if (!make || make === '&nbsp;') return;

    const vin = cellText(idx.vin);
    if (vin.length !== 17) {
      skipped.push({ rowNumber: i + 1, vin, reason: `Invalid VIN length (${vin.length}, expected 17)` });
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

  return { rows: parsed, skipped };
}
