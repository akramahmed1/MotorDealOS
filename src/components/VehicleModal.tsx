'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

// Shape of a row from the real `vehicles_enriched` view / `vehicles` table (see docs/schema-snapshot.csv).
interface VehicleRecord {
  id: string;
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  color: string | null;
  body_style: string | null;
  miles: number | null;
  price: number | null;
  status: string;
  lot_location: string;
  video_url: string | null;
  features: Record<string, unknown> | null;
  acquisition_cost: number | null;
  transport_cost: number | null;
  inspection_cost: number | null;
  service_cost: number | null;
  wash_cost: number | null;
  detail_cost: number | null;
  garage_cost: number | null;
  marketing_cost: number | null;
}

// Local edit-form state (all fields required for controlled inputs; features kept as a JSON string while editing).
interface Vehicle {
  id?: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  color: string;
  body_style: string;
  miles: number;
  price: number;
  status: string;
  lot_location: string;
  acquisition_cost: number;
  transport_cost: number;
  inspection_cost: number;
  service_cost: number;
  wash_cost: number;
  detail_cost: number;
  garage_cost: number;
  marketing_cost: number;
  video_url: string;
  features: string;
}

interface VehicleModalProps {
  vehicle: VehicleRecord | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}

const emptyVehicle: Vehicle = {
  vin: '',
  year: new Date().getFullYear(),
  make: '',
  model: '',
  trim: '',
  color: '',
  body_style: '',
  miles: 0,
  price: 0,
  status: 'acquired',
  lot_location: 'main',
  acquisition_cost: 0,
  transport_cost: 0,
  inspection_cost: 0,
  service_cost: 0,
  wash_cost: 0,
  detail_cost: 0,
  garage_cost: 0,
  marketing_cost: 0,
  video_url: '',
  features: '',
};

export default function VehicleModal({ vehicle, companyId, onClose, onSaved }: VehicleModalProps) {
  const [form, setForm] = useState<Vehicle>(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserClient();

  useEffect(() => {
    if (vehicle) {
      setForm({
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year ?? new Date().getFullYear(),
        make: vehicle.make ?? '',
        model: vehicle.model ?? '',
        trim: vehicle.trim ?? '',
        color: vehicle.color ?? '',
        body_style: vehicle.body_style ?? '',
        miles: vehicle.miles ?? 0,
        price: vehicle.price ?? 0,
        status: vehicle.status,
        lot_location: vehicle.lot_location,
        acquisition_cost: vehicle.acquisition_cost ?? 0,
        transport_cost: vehicle.transport_cost ?? 0,
        inspection_cost: vehicle.inspection_cost ?? 0,
        service_cost: vehicle.service_cost ?? 0,
        wash_cost: vehicle.wash_cost ?? 0,
        detail_cost: vehicle.detail_cost ?? 0,
        garage_cost: vehicle.garage_cost ?? 0,
        marketing_cost: vehicle.marketing_cost ?? 0,
        video_url: vehicle.video_url ?? '',
        features: vehicle.features ? JSON.stringify(vehicle.features, null, 2) : '',
      });
    } else {
      setForm(emptyVehicle);
    }
  }, [vehicle]);

  const handleChange = (field: keyof Vehicle, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    // Build payload with ONLY editable fields
    // Exclude: days_on_market, total_cost_basis, profit_projection (computed/generated)
    // updated_by (and created_by on insert) mark this as a human edit — the AutoFunds
    // importer deliberately leaves updated_by null so the two are distinguishable
    // (see docs/AutoFunds import conflict rule in CLAUDE.md).
    const payload = {
      company_id: companyId,
      updated_by: userId,
      vin: form.vin,
      year: form.year,
      make: form.make,
      model: form.model,
      trim: form.trim,
      color: form.color,
      body_style: form.body_style,
      miles: form.miles,
      price: form.price,
      status: form.status,
      lot_location: form.lot_location,
      acquisition_cost: form.acquisition_cost,
      transport_cost: form.transport_cost,
      inspection_cost: form.inspection_cost,
      service_cost: form.service_cost,
      wash_cost: form.wash_cost,
      detail_cost: form.detail_cost,
      garage_cost: form.garage_cost,
      marketing_cost: form.marketing_cost,
      video_url: form.video_url,
      features: (() => {
        try {
          return form.features ? JSON.parse(form.features) : {};
        } catch {
          return {};
        }
      })(),
    };

    if (vehicle?.id) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', vehicle.id);
      if (error) alert('Update failed: ' + error.message);
      else onSaved();
    } else {
      const { error } = await supabase.from('vehicles').insert({ ...payload, created_by: userId });
      if (error) alert('Insert failed: ' + error.message);
      else onSaved();
    }

    setSaving(false);
    onClose();
  };

  const costFields = [
    { key: 'acquisition_cost', label: 'Acquisition' },
    { key: 'transport_cost', label: 'Transport' },
    { key: 'inspection_cost', label: 'Inspection' },
    { key: 'service_cost', label: 'Service' },
    { key: 'wash_cost', label: 'Wash' },
    { key: 'detail_cost', label: 'Detail' },
    { key: 'garage_cost', label: 'Garage' },
    { key: 'marketing_cost', label: 'Marketing' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">VIN *</label>
              <input required className="w-full rounded border px-3 py-2" value={form.vin} onChange={(e) => handleChange('vin', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={form.year} onChange={(e) => handleChange('year', parseInt(e.target.value))} />
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Trim</label>
              <input className="w-full rounded border px-3 py-2" value={form.trim} onChange={(e) => handleChange('trim', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
              <input className="w-full rounded border px-3 py-2" value={form.color} onChange={(e) => handleChange('color', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Body Style</label>
              <input className="w-full rounded border px-3 py-2" value={form.body_style} onChange={(e) => handleChange('body_style', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Miles</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={form.miles} onChange={(e) => handleChange('miles', parseInt(e.target.value))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
              <input type="number" step="0.01" required className="w-full rounded border px-3 py-2" value={form.price} onChange={(e) => handleChange('price', parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select className="w-full rounded border px-3 py-2" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="acquired">Acquired</option>
                <option value="recon">Recon</option>
                <option value="photo_ready">Photo Ready</option>
                <option value="live">Live</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
                <option value="exported">Exported</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lot Location</label>
              <select className="w-full rounded border px-3 py-2" value={form.lot_location} onChange={(e) => handleChange('lot_location', e.target.value)}>
                <option value="main">Main Lot Glenview</option>
                <option value="renaissance">Renaissance Storage</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Cost Basis Breakdown</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {costFields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{field.label}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border px-3 py-2"
                    value={form[field.key]}
                    onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Video URL</label>
              <input className="w-full rounded border px-3 py-2" value={form.video_url} onChange={(e) => handleChange('video_url', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Features (JSON)</label>
              <input className="w-full rounded border px-3 py-2 font-mono text-xs" placeholder='{"sunroof": true}' value={form.features} onChange={(e) => handleChange('features', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="rounded border px-4 py-2 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}