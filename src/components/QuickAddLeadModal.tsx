'use client';

import { useState } from 'react';

interface QuickAddLeadModalProps {
  companyId: string;
  vehicles: { id: string; year: number; make: string; model: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const SOURCES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'walkin', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
] as const;

// Fast lead entry for the lot / phone / social DMs — meant to take under 30 seconds.
export default function QuickAddLeadModal({ companyId, vehicles, onClose, onSaved }: QuickAddLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<string>('walkin');
  const [vehicleId, setVehicleId] = useState('');
  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError('Confirm the customer agreed to be contacted before saving.');
      return;
    }
    setError('');
    setSaving(true);

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: companyId,
        name,
        phone,
        email: '',
        source,
        lead_score: 'warm',
        vehicle_id: vehicleId || null,
        notes: note,
        consent: true,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      setError('Save failed. Try again.');
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Quick Add Lead</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name *</label>
            <input
              autoFocus
              required
              className="w-full rounded border px-3 py-2 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
            <input
              required
              type="tel"
              className="w-full rounded border px-3 py-2 text-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  className={`rounded border px-2 py-2 text-sm ${
                    source === s.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {vehicles.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle (optional)</label>
              <select
                className="w-full rounded border px-3 py-2 text-base"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">General inquiry</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <input
              className="w-full rounded border px-3 py-2 text-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>Customer agreed that MOTOR DEALS USA may contact them by phone, text, or email about this inquiry.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded bg-green-600 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Lead'}
          </button>
        </form>
      </div>
    </div>
  );
}
