import type { Metadata } from 'next';
import { DEALERSHIP_NAME, DEALERSHIP_LOCALITY } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Sell Your Car',
  description: `Sell your car to ${DEALERSHIP_NAME} in ${DEALERSHIP_LOCALITY} — fast, fair offers on your vehicle.`,
  alternates: { canonical: '/sell-your-car' },
};

export default function SellYourCarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
