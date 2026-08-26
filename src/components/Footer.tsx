import Link from 'next/link';
import {
  DEALERSHIP_NAME,
  DEALERSHIP_ADDRESS,
  DEALERSHIP_PHONE,
  DEALERSHIP_HOURS,
  PRICE_DISCLAIMER,
} from '@/lib/site-config';

export default function Footer() {
  return (
    <footer className="border-t bg-white px-6 py-10 text-sm text-gray-600">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="font-semibold text-gray-900">{DEALERSHIP_NAME}</div>
            <p className="mt-1">{DEALERSHIP_ADDRESS}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">Hours</div>
            <p className="mt-1">{DEALERSHIP_HOURS}</p>
          </div>
          <div>
            <div className="font-semibold text-gray-900">Call Us</div>
            <p className="mt-1">
              <a href={`tel:${DEALERSHIP_PHONE.replace(/[^\d+]/g, '')}`} className="hover:underline">
                {DEALERSHIP_PHONE}
              </a>
            </p>
          </div>
        </div>

        <p className="mt-8 text-xs text-gray-500">{PRICE_DISCLAIMER}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <span>&copy; {new Date().getFullYear()} {DEALERSHIP_NAME}. All rights reserved.</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
