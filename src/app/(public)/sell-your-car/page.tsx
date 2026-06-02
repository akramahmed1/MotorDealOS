'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function SellYourCarPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    miles: '',
    condition: 'good',
    asking_price: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('leads').insert({
      company_id: '00000000-0000-0000-0000-000000000001',
      name: form.name,
      phone: form.phone,
      email: form.email,
      source: 'sell_form',
      lead_score: 'warm',
      status: 'new',
      notes: `VIN: ${form.vin}, Year: ${form.year}, Make: ${form.make}, Model: ${form.model}, Miles: ${form.miles}, Condition: ${form.condition}, Asking: $${form.asking_price}. ${form.notes}`,
    });

    if (error) alert('Submit failed: ' + error.message);
    else setSubmitted(true);

    setSaving(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow text-center">
          <h1 className="text-2xl font-bold text-green-600">Thank You!</h1>
          <p className="mt-4 text-gray-600">We received your submission. Our team will contact you within 24 hours.</p>
          <a href="/" className="mt-6 inline-block text-blue-600 hover:underline">Back to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Sell Your Car</h1>
          <p className="mt-1 text-gray-600">Get a cash offer from MotorDeals USA</p>
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="w-full rounded border px-3 py-2" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">VIN</label>
              <input className="w-full rounded border px-3 py-2" value={form.vin} onChange={(e) => handleChange('vin', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={form.year} onChange={(e) => handleChange('year', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Make</label>
              <input className="w-full rounded border px-3 py-2" value={form.make} onChange={(e) => handleChange('make', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Model</label>
              <input className="w-full rounded border px-3 py-2" value={form.model} onChange={(e) => handleChange('model', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Miles</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={form.miles} onChange={(e) => handleChange('miles', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Condition</label>
              <select className="w-full rounded border px-3 py-2" value={form.condition} onChange={(e) => handleChange('condition', e.target.value)}>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Asking Price</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={form.asking_price} onChange={(e) => handleChange('asking_price', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea className="w-full rounded border px-3 py-2" rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
          </div>
          <button type="submit" disabled={saving} className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Submitting...' : 'Get Cash Offer'}
          </button>
        </form>
      </div>
    </div>
  );
}