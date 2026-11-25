// TODO(owner): set NEXT_PUBLIC_SITE_URL to the real domain at launch (LAUNCH-CHECKLIST Stage C).
// Until then: explicit NEXT_PUBLIC_SITE_URL wins (e.g. local dev), otherwise fall back to
// Vercel's own auto-provided deployment URL (VERCEL_URL, no protocol, set per environment —
// preview deployments each get their own, so this never needs manual updates), otherwise
// localhost as the last resort for tooling that runs outside `next dev`/Vercel entirely.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// The one dealership this app writes for. Server code sets this itself.
// Public forms also send it, but those values are ignored.
export const DEALERSHIP_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export const DEALERSHIP_NAME = 'MOTOR DEALS USA';
export const DEALERSHIP_LEGAL_NAME = 'Cash Any Car LLC';
export const DEALERSHIP_CITY = 'Glenview';
export const DEALERSHIP_STATE = 'IL';
export const DEALERSHIP_LOCALITY = `${DEALERSHIP_CITY}, ${DEALERSHIP_STATE}`;
export const DEALERSHIP_ADDRESS = '1822 Johns Drive, Glenview, IL 60025';
export const DEALERSHIP_PHONE = '(773) 350-0002';
export const DEALERSHIP_PHONE_SECONDARY = '(224) 766-5842';
export const DEALERSHIP_HOURS = 'Mon–Sat 10:00 AM – 7:00 PM, Sunday closed';
export const PRICE_DISCLAIMER = 'Price excludes tax, title, license, and documentation fee.';

export const SITE_DESCRIPTION = `Quality used vehicles in ${DEALERSHIP_LOCALITY} — inspected, priced fair, ready to drive.`;
