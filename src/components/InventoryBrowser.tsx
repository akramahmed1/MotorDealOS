'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { vehicleSlug, type PublicVehicle } from '@/lib/vehicle-types';

type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'miles_asc';

export default function InventoryBrowser({ vehicles }: { vehicles: PublicVehicle[] }) {
  const [make, setMake] = useState('');
  const [bodyStyle, setBodyStyle] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  const makes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.make).filter(Boolean))).sort() as string[],
    [vehicles]
  );
  const bodyStyles = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.body_style).filter(Boolean))).sort() as string[],
    [vehicles]
  );

  const filtered = useMemo(() => {
    let result = vehicles.filter((v) => {
      if (make && v.make !== make) return false;
      if (bodyStyle && v.body_style !== bodyStyle) return false;
      if (minPrice && (v.price ?? 0) < Number(minPrice)) return false;
      if (maxPrice && (v.price ?? 0) > Number(maxPrice)) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return (a.price ?? 0) - (b.price ?? 0);
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'miles_asc':
          return (a.miles ?? 0) - (b.miles ?? 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [vehicles, make, bodyStyle, minPrice, maxPrice, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <select className="rounded border px-3 py-2" value={make} onChange={(e) => setMake(e.target.value)}>
          <option value="">All Makes</option>
          {makes.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2" value={bodyStyle} onChange={(e) => setBodyStyle(e.target.value)}>
          <option value="">All Body Styles</option>
          {bodyStyles.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Min Price"
          className="w-32 rounded border px-3 py-2"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Max Price"
          className="w-32 rounded border px-3 py-2"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
        <select className="rounded border px-3 py-2" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="miles_asc">Mileage: Low to High</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500">No vehicles match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
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
    </div>
  );
}
