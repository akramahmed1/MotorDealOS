import * as XLSX from 'xlsx';

// Parses MotorDeals_Team_Operations_v2 format (docs/team-workbook-sample.xlsx).
// See SKILLS.md Skill 2. Only LEADS, COSTING, and ARBITRATION-TRANSPORT write to the
// database — CAR TOTALS is formulas (skip), the rest aren't named as import targets
// in CLAUDE.md's Task 4 spec.

export interface ParsedLeadRow {
  rowNumber: number;
  date: Date | null;
  salesperson: string | null;
  customerName: string | null;
  phone: string | null;
  sourceRaw: string | null;
  vehicleText: string | null;
  vin6: string | null;
  statusRaw: string | null;
  appointmentDate: Date | null;
  nextAction: string | null;
  notes: string | null;
}

export interface ParsedCostingRow {
  rowNumber: number;
  date: Date | null;
  vin6: string | null;
  vehicleText: string | null;
  category: string | null;
  item: string | null;
  amount: number | null;
  paidWith: string | null;
  enteredBy: string | null;
  notes: string | null;
}

export interface ParsedArbitrationRow {
  rowNumber: number;
  purchaseDate: Date | null;
  vin6: string | null;
  vehicleText: string | null;
  auction: string | null;
  transportStatus: string | null;
  pickupDate: Date | null;
  deliveredDate: Date | null;
  issueFound: string | null;
  statusNotes: string | null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    // Defensive text-date parsing for legacy sheets (SKILLS.md Skill 2 #6): try
    // MM/DD/YYYY then DD/M/YYYY. Ambiguous (both plausible, different result) -> null,
    // caller routes to human review rather than guessing.
    const parts = value.trim().split(/[/\-]/);
    if (parts.length === 3) {
      const [a, b, y] = parts.map((p) => parseInt(p, 10));
      const year = y < 100 ? 2000 + y : y;
      const mmdd = a <= 12 && b <= 31 ? new Date(year, a - 1, b) : null;
      const ddmm = b <= 12 && a <= 31 ? new Date(year, b - 1, a) : null;
      if (mmdd && ddmm && mmdd.getTime() !== ddmm.getTime() && a !== b) return null; // ambiguous
      if (mmdd) return mmdd;
      if (ddmm) return ddmm;
    }
  }
  return null;
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function num(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export interface ParsedWorkbook {
  leads: ParsedLeadRow[];
  costing: ParsedCostingRow[];
  arbitration: ParsedArbitrationRow[];
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { cellDates: true });

  const leadsSheet = wb.Sheets['LEADS'];
  const leads: ParsedLeadRow[] = leadsSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(leadsSheet, { defval: null }).map((row, i) => ({
        rowNumber: i + 2,
        date: toDate(row['Date']),
        salesperson: str(row['Salesperson']),
        customerName: str(row['Customer Name']),
        phone: str(row['Phone']),
        sourceRaw: str(row['Source']),
        vehicleText: str(row['Vehicle (Year Make Model)']),
        vin6: str(row['VIN6']),
        statusRaw: str(row['Status']),
        appointmentDate: toDate(row['Appointment Date']),
        nextAction: str(row['Next Action']),
        notes: str(row['Notes / Conversation']),
      }))
    : [];

  const costingSheet = wb.Sheets['COSTING'];
  const costing: ParsedCostingRow[] = costingSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(costingSheet, { defval: null }).map((row, i) => ({
        rowNumber: i + 2,
        date: toDate(row['Date']),
        vin6: str(row['VIN6']),
        vehicleText: str(row['Vehicle (Year Make Model)']),
        category: str(row['Category']),
        item: str(row['Item / What was bought']),
        amount: num(row['Amount ($)']),
        paidWith: str(row['Paid With']),
        enteredBy: str(row['Entered By']),
        notes: str(row['Notes']),
      }))
    : [];

  const arbitrationSheet = wb.Sheets['ARBITRATION-TRANSPORT'];
  const arbitration: ParsedArbitrationRow[] = arbitrationSheet
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(arbitrationSheet, { defval: null }).map((row, i) => ({
        rowNumber: i + 2,
        purchaseDate: toDate(row['Purchase Date']),
        vin6: str(row['VIN6']),
        vehicleText: str(row['Vehicle (Year Make Model)']),
        auction: str(row['Auction']),
        transportStatus: str(row['Transport Status']),
        pickupDate: toDate(row['Pickup Date']),
        deliveredDate: toDate(row['Delivered Date']),
        issueFound: str(row['Issue Found?']),
        statusNotes: str(row['Status Notes / Daily Updates']),
      }))
    : [];

  // Drop fully-blank rows (VIN6 null and no customer/category/auction) — these are
  // unused template rows below the real data, not real entries.
  return {
    leads: leads.filter((r) => r.vin6 || r.customerName),
    costing: costing.filter((r) => r.vin6 || r.category),
    arbitration: arbitration.filter((r) => r.vin6 || r.auction),
  };
}

// Source dropdown -> leads.source (leads_source_check). "Other" has no mapping on
// purpose (see CLAUDE.md) -- caller must route those to human review, never guess.
export const SOURCE_MAP: Record<string, string> = {
  cargurus: 'cargurus',
  facebook: 'facebook',
  instagram: 'instagram',
  tiktok: 'tiktok',
  carsforsale: 'carsforsale',
  'website chat': 'chat_agent',
  'walk-in': 'walkin',
  'phone call': 'phone',
  referral: 'referral',
};

// Status dropdown -> leads.status (leads_status_check). All three "Lost - *" reasons
// collapse to 'lost'; the specific reason is preserved in source_metadata, not dropped.
export const STATUS_MAP: Record<string, string> = {
  new: 'new',
  contacted: 'contacted',
  'appointment set': 'appointment',
  'came in': 'came in',
  'test drive': 'test drive',
  negotiating: 'negotiating',
  sold: 'sold',
  'lost - no reply': 'lost',
  'lost - not interested': 'lost',
  'lost - financing': 'lost',
};

// COSTING category -> vehicle cost column. Wash-Detail intentionally goes to wash_cost
// only (don't fabricate a split); Title-Fees and Gas/Other go to service_cost with a
// metadata note (see CLAUDE.md Task 4 notes for both conventions).
export const COST_CATEGORY_MAP: Record<string, { column: string; note?: string }> = {
  parts: { column: 'service_cost' },
  'labor-service': { column: 'service_cost' },
  'wash-detail': { column: 'wash_cost' },
  transport: { column: 'transport_cost' },
  'auction fee': { column: 'acquisition_cost' },
  gas: { column: 'service_cost', note: 'gas' },
  marketing: { column: 'marketing_cost' },
  'title-fees': { column: 'service_cost', note: 'title_fees' },
  other: { column: 'service_cost', note: 'other' },
};
