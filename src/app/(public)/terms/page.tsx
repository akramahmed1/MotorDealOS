import type { Metadata } from 'next';
import {
  DEALERSHIP_NAME,
  DEALERSHIP_LEGAL_NAME,
  DEALERSHIP_ADDRESS,
  DEALERSHIP_PHONE,
  PRICE_DISCLAIMER,
} from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of use for the ${DEALERSHIP_NAME} website.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-gray mt-8 max-w-none space-y-6 text-gray-700">
        <p>
          These Terms of Service govern your use of this website, operated by {DEALERSHIP_NAME} (
          {DEALERSHIP_LEGAL_NAME}), a licensed independent used-car dealer located at {DEALERSHIP_ADDRESS}.
          By using this site, you agree to these terms.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Vehicle Listings</h2>
          <p>
            We make reasonable efforts to keep vehicle listings, pricing, mileage, and photos accurate and
            current. However, listings can change without notice — a vehicle may sell, or details may be
            updated, before your visit. {PRICE_DISCLAIMER} Please confirm current availability, condition,
            and final price directly with us before visiting.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">No Warranty on Website Content</h2>
          <p>
            This website and its content are provided "as is," without warranties of any kind. Vehicle
            specifications, features, and history are provided for general informational purposes and do
            not replace an in-person inspection, test drive, or vehicle history report.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Communications</h2>
          <p>
            When you submit a form or chat with our website assistant, you agree that {DEALERSHIP_NAME} may
            contact you by phone, text, or email about your inquiry, as described in our{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Third-Party Links and Platforms</h2>
          <p>
            Our inventory may also appear on third-party platforms (including CarGurus, CARFAX, and
            CarsForSale). We are not responsible for the content, accuracy, or availability of those
            external sites.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Governing Law</h2>
          <p>These terms are governed by the laws of the State of Illinois.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Contact Us</h2>
          <p>
            {DEALERSHIP_NAME}
            <br />
            {DEALERSHIP_ADDRESS}
            <br />
            {DEALERSHIP_PHONE}
          </p>
        </section>
      </div>
    </div>
  );
}
