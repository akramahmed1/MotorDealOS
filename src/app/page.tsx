import Link from 'next/link';
import Image from 'next/image';
import { getLiveVehicles } from '@/lib/vehicles';
import { vehicleSlug } from '@/lib/vehicle-types';

export default async function Home() {
  const vehicles = await getLiveVehicles();
  const featured = vehicles.slice(0, 6);

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gray-900 px-6 py-20 text-center text-white">
        <h1 className="text-4xl font-bold sm:text-5xl">MOTOR DEALS USA</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-300">
          Quality used vehicles in Glenview, IL — inspected, priced fair, ready to drive.
        </p>
        <Link
          href="/inventory"
          className="mt-8 inline-block rounded bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
        >
          View Inventory
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">Featured Vehicles</h2>
        {featured.length === 0 ? (
          <p className="text-gray-500">New inventory coming soon — check back shortly.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => (
              <Link
                key={v.id}
                href={`/inventory/${vehicleSlug(v)}`}
                className="block overflow-hidden rounded-lg bg-white shadow transition hover:shadow-md"
              >
                <div className="relative flex h-40 items-center justify-center bg-gray-200 text-sm text-gray-400">
                  {v.photos?.[0] ? (
                    <Image src={v.photos[0]} alt={`${v.year} ${v.make} ${v.model}`} fill className="object-cover" />
                  ) : (
                    'Photo coming soon'
                  )}
                </div>
                <div className="p-4">
                  <div className="font-medium text-gray-900">
                    {v.year} {v.make} {v.model}
                  </div>
                  <div className="text-sm text-gray-500">{v.trim} &bull; {v.miles?.toLocaleString()} mi</div>
                  <div className="mt-2 text-lg font-bold text-blue-600">${v.price?.toLocaleString()}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="border-t bg-white px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Visit Us</h3>
            {/* TODO(owner): confirm exact street address before this ships publicly */}
            <p className="text-gray-600">Glenview, IL</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Hours</h3>
            {/* TODO(owner): confirm real hours before this ships publicly */}
            <p className="text-gray-600">Mon–Sat: 9am–7pm<br />Sun: By appointment</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-900">Call Us</h3>
            {/* TODO(owner): add real phone number before this ships publicly */}
            <p className="text-gray-600">(___) ___-____</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        {/* TODO(owner): replace with real reviews/testimonials/certifications before launch */}
        <h2 className="text-xl font-semibold text-gray-900">Why Buy From Us</h2>
        <p className="mt-2 text-gray-500">Trust content placeholder — reviews and certifications coming soon.</p>
      </section>
    </main>
  );
}
