'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import LeadModal from '@/components/LeadModal';

interface Lead {
  id: string;
  phone: string;
  email: string;
  name: string;
  source: string;
  lead_score: string;
  status: string;
  first_contact_at: string;
  contact_day: string;
  notes: string;
  vehicle_id: string | null;
  vehicles: { year: number; make: string; model: string } | null;
}

interface VehicleOption {
  id: string;
  year: number;
  make: string;
  model: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  appointment: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  sold: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-800',
};

const scoreColors: Record<string, string> = {
  hot: 'bg-red-100 text-red-800',
  warm: 'bg-orange-100 text-orange-800',
  cold: 'bg-blue-100 text-blue-800',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const supabase = createBrowserClient();

  async function loadData() {
    setLoading(true);

    const { data: leadsData } = await supabase
      .from('leads')
      .select('*, vehicles(year, make, model)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('id, year, make, model')
      .is('deleted_at', null)
      .eq('status', 'live');

    setLeads(leadsData || []);
    setVehicles(vehiclesData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredLeads = leads.filter((l) => {
    const term = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(term) ||
      l.phone?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    const { error } = await supabase.from('leads').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) alert('Delete failed: ' + error.message);
    else loadData();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
          <p className="text-gray-600">Track prospects from first contact to close</p>
        </div>
        <button
          onClick={() => { setEditingLead(null); setModalOpen(true); }}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + Add Lead
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Search name, phone, email..."
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
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="appointment">Appointment</option>
          <option value="negotiation">Negotiation</option>
          <option value="sold">Sold</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading leads...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => (
                <tr key={l.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[l.status] || 'bg-gray-100'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${scoreColors[l.lead_score] || 'bg-gray-100'}`}>
                      {l.lead_score}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{l.name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{l.phone}</div>
                    <div className="text-xs text-gray-500">{l.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{l.source.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs">
                    {l.vehicles ? `${l.vehicles.year} ${l.vehicles.make} ${l.vehicles.model}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs">{l.contact_day}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingLead(l); setModalOpen(true); }}
                        className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
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
          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-gray-500">No leads yet. Add your first lead.</div>
          )}
        </div>
      )}

      {modalOpen && (
        <LeadModal
          lead={editingLead}
          companyId="00000000-0000-0000-0000-000000000001"
          vehicles={vehicles}
          onClose={() => setModalOpen(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
