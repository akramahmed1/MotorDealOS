'use client';

import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

interface QuickAddLeadModalProps {
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}

const SOURCES = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone', label: 'Phone' },
] as const;

export default function QuickAddLeadModal({ companyId, onClose, onSaved }: QuickAddLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<string>('walk_in');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from('leads').insert({
      company_id: companyId,
      name,
      phone,
      source,
      lead_score: 'warm',
      status: 'new',
      notes: note,
    });

    setSaving(false);
    if (error) {
      alert('Quick add failed: ' + error.message);
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note</label>
            <input
              className="w-full rounded border px-3 py-2 text-base"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>
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
