import type { Metadata } from 'next';
import { DEALERSHIP_NAME, DEALERSHIP_LOCALITY } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: `Get in touch with ${DEALERSHIP_NAME} in ${DEALERSHIP_LOCALITY} — questions about buying, selling, financing, or a vehicle in our inventory.`,
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
