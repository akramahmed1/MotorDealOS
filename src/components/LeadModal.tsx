'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface Lead {
  id?: string;
  phone: string;
  email: string;
  name: string;
  source: string;
  lead_score: string;
  status: string;
  notes: string;
  vehicle_id?: string | null;
}

interface LeadModalProps {
  lead: Lead | null;
  companyId: string;
  vehicles: { id: string; year: number; make: string; model: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const emptyLead: Lead = {
  phone: '',
  email: '',
  name: '',
  source: 'website',
  lead_score: 'warm',
  status: 'new',
  notes: '',
};

const sourceOptions = [
  'website', 'cargurus', 'carfax', 'facebook', 'instagram', 'tiktok',
  'marketplace', 'export_form', 'sell_form', 'walkin', 'referral',
  'chat_agent', 'voice_agent'
];

export default function LeadModal({ lead, companyId, vehicles, onClose, onSaved }: LeadModalProps) {
  const [form, setForm] = useState<Lead>(emptyLead);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (lead) setForm(lead);
    else setForm(emptyLead);
  }, [lead]);

  const handleChange = (field: keyof Lead, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      company_id: companyId,
      phone: form.phone,
      email: form.email,
      name: form.name,
      source: form.source,
      lead_score: form.lead_score,
      status: form.status,
      notes: form.notes,
      vehicle_id: form.vehicle_id || null,
    };

    if (lead?.id) {
      const { error } = await supabase.from('leads').update(payload).eq('id', lead.id);
      if (error) alert('Update failed: ' + error.message);
      else onSaved();
    } else {
      const { error } = await supabase.from('leads').insert(payload);
      if (error) alert('Insert failed: ' + error.message);
      else onSaved();
    }

    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone *</label>
              <input required className="w-full rounded border px-3 py-2" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="(847) 555-0123" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" className="w-full rounded border px-3 py-2" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input className="w-full rounded border px-3 py-2" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
              <select className="w-full rounded border px-3 py-2" value={form.source} onChange={(e) => handleChange('source', e.target.value)}>
                {sourceOptions.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lead Score</label>
              <select className="w-full rounded border px-3 py-2" value={form.lead_score} onChange={(e) => handleChange('lead_score', e.target.value)}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select className="w-full rounded border px-3 py-2" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="appointment">Appointment</option>
                <option value="negotiation">Negotiation</option>
                <option value="sold">Sold</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Interested Vehicle</label>
              <select className="w-full rounded border px-3 py-2" value={form.vehicle_id || ''} onChange={(e) => handleChange('vehicle_id', e.target.value)}>
                <option value="">None / General Inquiry</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
              <textarea className="w-full rounded border px-3 py-2" rows={3} value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : lead ? 'Update Lead' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}