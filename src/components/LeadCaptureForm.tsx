'use client';

import { useState } from 'react';

const CONSENT_TEXT =
  'By submitting, you agree that MOTOR DEALS USA may contact you by phone, text, or email about your inquiry.';

interface LeadCaptureFormProps {
  vehicleId: string;
  intent: 'test_drive' | 'ask_about_car';
  onDone?: () => void;
}

export default function LeadCaptureForm({ vehicleId, intent, onDone }: LeadCaptureFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Please confirm you agree to be contacted before submitting.');
      return;
    }
    setError('');
    setSaving(true);

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: '00000000-0000-0000-0000-000000000001',
        name,
        phone,
        email,
        source: 'website',
        lead_score: 'warm',
        vehicle_id: vehicleId,
        notes: `[${intent === 'test_drive' ? 'Schedule Test Drive' : 'Ask About This Car'}] ${message}`,
        consent: true,
      }),
    });
    const raw: unknown = await res.json().catch(() => null);

    setSaving(false);

    if (!res.ok) {
      const serverError =
        typeof raw === 'object' && raw !== null && 'error' in raw && typeof raw.error === 'string'
          ? raw.error
          : null;
      setError(serverError ?? 'Something went wrong submitting your request. Please call us instead.');
      return;
    }

    setSubmitted(true);
    onDone?.();
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Thanks — we received your request and will reach out shortly.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
        <input required className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
          <input required className="w-full rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input type="email" className="w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
        <textarea className="w-full rounded border px-3 py-2" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
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
      <button
        type="submit"
        disabled={saving}
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Sending...' : intent === 'test_drive' ? 'Schedule Test Drive' : 'Ask About This Car'}
      </button>
    </form>
  );
}
