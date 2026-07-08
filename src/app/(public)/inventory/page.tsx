import type { Metadata } from 'next';
import { getLiveVehicles } from '@/lib/vehicles';
import InventoryBrowser from '@/components/InventoryBrowser';
import { DEALERSHIP_LOCALITY } from '@/lib/site-config';

export const metadata: Metadata = {
  title: `Used Car Inventory in ${DEALERSHIP_LOCALITY}`,
  description: `Browse our full inventory of quality used vehicles in ${DEALERSHIP_LOCALITY}, filterable by make, price, and body style.`,
  alternates: { canonical: '/inventory' },
};

export default async function InventoryPage() {
  const vehicles = await getLiveVehicles();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Inventory</h1>
      <InventoryBrowser vehicles={vehicles} />
    </div>
  );
}
