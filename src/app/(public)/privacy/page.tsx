import type { Metadata } from 'next';
import {
  DEALERSHIP_NAME,
  DEALERSHIP_LEGAL_NAME,
  DEALERSHIP_ADDRESS,
  DEALERSHIP_PHONE,
} from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${DEALERSHIP_NAME} collects, uses, and protects your information.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-gray mt-8 max-w-none space-y-6 text-gray-700">
        <p>
          {DEALERSHIP_NAME} ({DEALERSHIP_LEGAL_NAME}) ("we," "us," or "our") operates this website. This
          Privacy Policy explains what information we collect when you visit our site or contact us, how
          we use it, and the choices you have.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Information We Collect</h2>
          <p>When you use a contact form, chat with our website assistant, or ask about a vehicle, we collect:</p>
          <ul className="list-disc pl-6">
            <li>Your name, phone number, and email address</li>
            <li>Details about the vehicle you're interested in and any message you send us</li>
            <li>General usage data about how visitors use our site (via Vercel Analytics), which does not identify you individually</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">How We Use Your Information</h2>
          <p>We use the information you provide to:</p>
          <ul className="list-disc pl-6">
            <li>Respond to your inquiry about a vehicle, trade-in, or general question</li>
            <li>Contact you by phone, text, or email about your inquiry, as you consent to when submitting a form</li>
            <li>Improve our website and inventory listings</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Text Messages and Calls (TCPA)</h2>
          <p>
            By submitting a form on this site, you agree that {DEALERSHIP_NAME} may contact you by phone,
            text, or email about your inquiry. Message and data rates may apply. You can ask to stop
            receiving texts or calls from us at any time by replying STOP or contacting us directly at{' '}
            {DEALERSHIP_PHONE}.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Third-Party Services</h2>
          <p>
            Our inventory and leads are also syndicated to or received from third-party platforms
            (including CarGurus, CARFAX, and CarsForSale). Those platforms have their own privacy
            policies governing information you submit directly to them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">Your Choices</h2>
          <p>
            You may ask us to access, correct, or delete the personal information we hold about you by
            contacting us using the information below.
          </p>
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
