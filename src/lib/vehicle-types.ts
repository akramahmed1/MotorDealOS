// Client-safe: types and pure helpers only. No server-only imports here —
// see src/lib/vehicles.ts for the data-fetching functions (next/headers dependent).

// Matches the real `vehicles` table (docs/schema-snapshot.csv). Public site only ever
// reads rows where status = 'live' and deleted_at is null (see vehicles_public_select RLS policy).
export interface PublicVehicle {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
  body_style: string | null;
  miles: number | null;
  price: number | null;
  status: string;
  lot_location: string;
  photos: string[] | null;
  video_url: string | null;
  features: Record<string, unknown> | null;
  created_at: string;
}

export function vinLast6(vin: string) {
  return vin.slice(-6);
}

export function vehicleSlug(vehicle: Pick<PublicVehicle, 'year' | 'make' | 'model' | 'vin'>) {
  const parts = [vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${parts}-${vinLast6(vehicle.vin).toLowerCase()}`;
}
