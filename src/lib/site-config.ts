// TODO(owner): set NEXT_PUBLIC_SITE_URL to the real domain at launch (LAUNCH-CHECKLIST Stage C).
// Until then: explicit NEXT_PUBLIC_SITE_URL wins (e.g. local dev), otherwise fall back to
// Vercel's own auto-provided deployment URL (VERCEL_URL, no protocol, set per environment —
// preview deployments each get their own, so this never needs manual updates), otherwise
// localhost as the last resort for tooling that runs outside `next dev`/Vercel entirely.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const DEALERSHIP_NAME = 'MOTOR DEALS USA';
// TODO(owner): confirm exact street address, hours, and phone before launch (see src/app/page.tsx TODOs).
export const DEALERSHIP_CITY = 'Glenview';
export const DEALERSHIP_STATE = 'IL';
export const DEALERSHIP_LOCALITY = `${DEALERSHIP_CITY}, ${DEALERSHIP_STATE}`;

export const SITE_DESCRIPTION = `Quality used vehicles in ${DEALERSHIP_LOCALITY} — inspected, priced fair, ready to drive.`;
