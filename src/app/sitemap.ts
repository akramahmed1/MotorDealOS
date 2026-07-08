import type { MetadataRoute } from 'next';
import { getLiveVehicles } from '@/lib/vehicles';
import { vehicleSlug } from '@/lib/vehicle-types';
import { SITE_URL } from '@/lib/site-config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await getLiveVehicles();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/inventory`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/sell-your-car`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const vehiclePages: MetadataRoute.Sitemap = vehicles.map((v) => ({
    url: `${SITE_URL}/inventory/${vehicleSlug(v)}`,
    lastModified: v.created_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticPages, ...vehiclePages];
}
