import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getVehicleBySlug } from '@/lib/vehicles';
import LeadCaptureForm from '@/components/LeadCaptureForm';
import { DEALERSHIP_LOCALITY, SITE_URL } from '@/lib/site-config';

interface VehicleDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: VehicleDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) return {};

  const title = `Used ${vehicle.year} ${vehicle.make} ${vehicle.model} in ${DEALERSHIP_LOCALITY}`;
  const description = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''} — ${
    vehicle.miles ? `${vehicle.miles.toLocaleString()} miles, ` : ''
  }$${vehicle.price?.toLocaleString() ?? 'call for price'}. Located in ${DEALERSHIP_LOCALITY}.`;

  return {
    title,
    description,
    alternates: { canonical: `/inventory/${slug}` },
    // Omit the openGraph key entirely (rather than setting it to undefined) when there's no
    // photo, so Next.js's file-convention opengraph-image.tsx fallback still applies.
    ...(vehicle.photos?.[0] ? { openGraph: { images: [{ url: vehicle.photos[0] }] } } : {}),
  };
}

export default async function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) notFound();

  const vehicleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    vehicleModelDate: vehicle.year,
    manufacturer: vehicle.make,
    model: vehicle.model,
    vehicleIdentificationNumber: vehicle.vin,
    mileageFromOdometer: vehicle.miles
      ? { '@type': 'QuantitativeValue', value: vehicle.miles, unitCode: 'SMI' }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: vehicle.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/inventory/${slug}`,
    },
  };

  const photos = vehicle.photos && vehicle.photos.length > 0 ? vehicle.photos : [];

  const specs: [string, string | number | null][] = [
    ['Year', vehicle.year],
    ['Make', vehicle.make],
    ['Model', vehicle.model],
    ['Trim', vehicle.trim],
    ['Color', vehicle.color],
    ['Body Style', vehicle.body_style],
    ['Mileage', vehicle.miles ? `${vehicle.miles.toLocaleString()} mi` : null],
    ['VIN', vehicle.vin],
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(vehicleJsonLd) }}
      />
      <h1 className="text-2xl font-bold text-gray-900">
        {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="relative h-80 w-full overflow-hidden rounded-lg bg-gray-200 sm:h-96">
            {photos.length > 0 ? (
              <Image src={photos[0]} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">Photos coming soon</div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {photos.slice(1).map((url, i) => (
                <div key={i} className="relative h-20 overflow-hidden rounded bg-gray-200">
                  <Image src={url} alt={`Photo ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <h2 className="mt-8 mb-3 text-lg font-semibold text-gray-900">Specifications</h2>
          <table className="w-full text-sm">
            <tbody>
              {specs
                .filter(([, value]) => value !== null && value !== undefined)
                .map(([label, value]) => (
                  <tr key={label} className="border-b">
                    <td className="py-2 pr-4 font-medium text-gray-600">{label}</td>
                    <td className="py-2 text-gray-900">{value}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-3xl font-bold text-blue-600">${vehicle.price?.toLocaleString()}</div>
            <p className="mt-1 text-xs text-gray-500">
              {/* TODO(owner): confirm exact doc fee amount before this ships publicly */}
              Price excludes tax, title, license, and $[doc fee] — confirm final price at time of sale.
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Schedule Test Drive</h3>
                <LeadCaptureForm vehicleId={vehicle.id} intent="test_drive" />
              </div>
              <div className="border-t pt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Ask About This Car</h3>
                <LeadCaptureForm vehicleId={vehicle.id} intent="ask_about_car" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
