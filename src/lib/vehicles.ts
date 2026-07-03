import { createClient } from '@/lib/supabase/server';
import type { PublicVehicle } from '@/lib/vehicle-types';

const PUBLIC_COLUMNS =
  'id, vin, year, make, model, trim, color, body_style, miles, price, status, lot_location, photos, video_url, features, created_at';

export async function getLiveVehicles(): Promise<PublicVehicle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'live')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading public vehicles:', error);
    return [];
  }
  return (data as unknown as PublicVehicle[]) || [];
}

export async function getVehicleBySlug(slug: string): Promise<PublicVehicle | null> {
  const last6 = slug.slice(-6);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'live')
    .is('deleted_at', null)
    .ilike('vin', `%${last6}`);

  if (error || !data || data.length === 0) return null;
  // VIN last-6 should be unique within an active lot; if collision, take the first match.
  return data[0] as unknown as PublicVehicle;
}
