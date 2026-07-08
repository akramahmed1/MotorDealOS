'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

const CONSENT_TEXT =
  'By submitting, you agree that MOTOR DEALS USA may contact you by phone, text, or email about your inquiry.';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    interest: 'general',
    message: '',
  });
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const supabase = createBrowserClient();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Please confirm you agree to be contacted before submitting.');
      return;
    }
    setError('');
    setSaving(true);

    const { error: insertError } = await supabase.from('leads').insert({
      company_id: '00000000-0000-0000-0000-000000000001',
      name: form.name,
      phone: form.phone,
      email: form.email,
      source: 'website',
      lead_score: 'warm',
      status: 'new',
      notes: `Interest: ${form.interest}. Message: ${form.message}`,
      source_metadata: { consent: true, consent_text_version: 'v1' },
    });

    if (insertError) alert('Submit failed: ' + insertError.message);
    else setSubmitted(true);

    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow text-center">
          <h1 className="text-2xl font-bold text-green-600">Message Sent!</h1>
          <p className="mt-4 text-gray-600">We will get back to you shortly.</p>
          <a href="/" className="mt-6 inline-block text-blue-600 hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-1 text-gray-600">MotorDeals USA — Glenview, IL</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
              <input required className="w-full rounded border px-3 py-2" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
              <input required className="w-full rounded border px-3 py-2" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="w-full rounded border px-3 py-2" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Interest</label>
            <select className="w-full rounded border px-3 py-2" value={form.interest} onChange={(e) => handleChange('interest', e.target.value)}>
              <option value="general">General Inquiry</option>
              <option value="buy">Buy a Car</option>
              <option value="sell">Sell a Car</option>
              <option value="export">Export / International</option>
              <option value="financing">Financing</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea className="w-full rounded border px-3 py-2" rows={4} value={form.message} onChange={(e) => handleChange('message', e.target.value)} />
          </div>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>{CONSENT_TEXT}</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
}