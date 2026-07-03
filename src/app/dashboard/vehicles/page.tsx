'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import VehicleModal from '@/components/VehicleModal';

// Matches the `vehicles_enriched` view (see docs/schema-snapshot.csv), which is `vehicles` plus days_on_market.
interface Vehicle {
  id: string;
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
  video_url: string;
  features: Record<string, unknown> | null;
  acquisition_cost: number;
  transport_cost: number;
  inspection_cost: number;
  service_cost: number;
  wash_cost: number;
  detail_cost: number;
  garage_cost: number;
  marketing_cost: number;
  total_cost_basis: number;
  profit_projection: number;
  days_on_market: number;
  created_at: string;
}

const statusColors: Record<string, string> = {
  acquired: 'bg-gray-100 text-gray-800',
  recon: 'bg-yellow-100 text-yellow-800',
  photo_ready: 'bg-blue-100 text-blue-800',
  live: 'bg-green-100 text-green-800',
  pending: 'bg-orange-100 text-orange-800',
  sold: 'bg-purple-100 text-purple-800',
  exported: 'bg-indigo-100 text-indigo-800',
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const supabase = createBrowserClient();

  async function loadVehicles() {
    setLoading(true);

    let query = supabase
      .from('vehicles_enriched')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, error } = await query;
    if (error) console.error('Error loading vehicles:', error);
    else setVehicles(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadVehicles();
  }, [statusFilter]);

  const filteredVehicles = vehicles.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.vin.toLowerCase().includes(term) ||
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.year.toString().includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vehicle? This is permanent.')) return;
    const { error } = await supabase.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Delete failed: ' + error.message);
    else loadVehicles();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Inventory</h1>
          <p className="text-gray-600">Manage acquisitions, pricing, and status</p>
        </div>
        <button
          onClick={() => { setEditingVehicle(null); setModalOpen(true); }}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Add Vehicle
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search VIN, Make, Model, Year..."
          className="w-96 rounded border px-3 py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border px-3 py-2"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="acquired">Acquired</option>
          <option value="recon">Recon</option>
          <option value="photo_ready">Photo Ready</option>
          <option value="live">Live</option>
          <option value="pending">Pending</option>
          <option value="sold">Sold</option>
          <option value="exported">Exported</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading vehicles...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">VIN</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Miles</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Cost Basis</th>
                <th className="px-4 py-3">Profit</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Lot</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => (
                <tr key={v.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[v.status] || 'bg-gray-100'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{v.vin}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{v.year} {v.make} {v.model}</div>
                    <div className="text-xs text-gray-500">{v.trim} &bull; {v.color}</div>
                  </td>
                  <td className="px-4 py-3">{v.miles?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">${v.price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">${v.total_cost_basis?.toLocaleString()}</td>
                  <td className={`px-4 py-3 font-medium ${v.profit_projection > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${v.profit_projection?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{v.days_on_market}</td>
                  <td className="px-4 py-3 text-xs">{v.lot_location}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingVehicle(v); setModalOpen(true); }}
                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVehicles.length === 0 && (
            <div className="py-12 text-center text-gray-500">No vehicles found. Add your first vehicle.</div>
          )}
        </div>
      )}

      {modalOpen && (
        <VehicleModal
          vehicle={editingVehicle}
          companyId="00000000-0000-0000-0000-000000000001"
          onClose={() => setModalOpen(false)}
          onSaved={loadVehicles}
        />
      )}
    </div>
  );
}