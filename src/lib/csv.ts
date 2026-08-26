// Minimal CSV serializer — no external dependency needed for this scale of export.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => csvCell(row[col])).join(','));
  return [header, ...lines].join('\n');
}
