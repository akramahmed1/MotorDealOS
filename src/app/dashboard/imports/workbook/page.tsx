'use client';

import { useState, useRef } from 'react';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

interface ReviewItem {
  rowNumber: number;
  reason: string;
}

interface Preview {
  leads: {
    toInsertCount: number;
    toInsert: { rowNumber: number; customerName: string | null; phone: string | null; source: string; status: string; vin6: string | null }[];
    needsReview: ReviewItem[];
  };
  costing: {
    vehicleCount: number;
    updates: { vin: string; deltas: Record<string, number>; notes: string[] }[];
    needsReview: ReviewItem[];
  };
  arbitration: {
    vehicleCount: number;
    updates: { vin: string; patch: Record<string, unknown> }[];
    needsReview: ReviewItem[];
  };
}

export default function WorkbookImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ leadsInserted: number; vehiclesCostUpdated: number; vehiclesArbitrationUpdated: number } | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const runPreview = async (selectedFile: File) => {
    setLoading(true);
    setError('');
    setPreview(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('companyId', COMPANY_ID);

    const res = await fetch('/api/imports/workbook', { method: 'POST', body: formData });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Preview failed');
      return;
    }
    setPreview(data.preview);
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    runPreview(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', COMPANY_ID);
    formData.append('confirm', 'true');

    const res = await fetch('/api/imports/workbook', { method: 'POST', body: formData });
    const data = await res.json();

    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Import failed');
      return;
    }
    setResult(data);
    setPreview(null);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const totalReview = preview
    ? preview.leads.needsReview.length + preview.costing.needsReview.length + preview.arbitration.needsReview.length
    : 0;
  const totalChanges = preview
    ? preview.leads.toInsertCount + preview.costing.vehicleCount + preview.arbitration.vehicleCount
    : 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Import Team Operations Workbook</h1>
      <p className="mb-6 text-gray-600">Upload the LEADS/COSTING/ARBITRATION-TRANSPORT workbook to sync leads, costs, and transport tracking.</p>

      {!preview && !result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
          }`}
        >
          <p className="text-gray-600">{loading ? 'Parsing...' : 'Drag & drop the team workbook .xlsx here, or tap to browse'}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFile(selected);
            }}
          />
        </div>
      )}

      {error && <div className="mt-4 rounded bg-red-50 p-4 text-red-700">{error}</div>}

      {preview && (
        <div className="mt-6 space-y-6">
          {totalChanges === 0 && totalReview === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              ✓ Nothing to import — no valid rows found in LEADS, COSTING, or ARBITRATION-TRANSPORT.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-green-600">{preview.leads.toInsertCount}</div>
              <div className="text-xs text-gray-500">New Leads</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-blue-600">{preview.costing.vehicleCount}</div>
              <div className="text-xs text-gray-500">Vehicles with Cost Updates</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-purple-600">{preview.arbitration.vehicleCount}</div>
              <div className="text-xs text-gray-500">Vehicles with Arbitration/Transport Updates</div>
            </div>
          </div>

          {totalReview > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-2 font-semibold text-orange-800">Needs Human Review ({totalReview}) — excluded from import</h3>
              <p className="mb-3 text-sm text-orange-700">Ambiguous VIN6, unmapped values, or missing/ambiguous dates. Never guessed.</p>
              {[...preview.leads.needsReview.map((r) => ({ ...r, sheet: 'LEADS' })),
                ...preview.costing.needsReview.map((r) => ({ ...r, sheet: 'COSTING' })),
                ...preview.arbitration.needsReview.map((r) => ({ ...r, sheet: 'ARBITRATION-TRANSPORT' }))]
                .map((r, i) => (
                  <div key={i} className="text-sm text-orange-800">
                    [{r.sheet}] Row {r.rowNumber}: {r.reason}
                  </div>
                ))}
            </div>
          )}

          {preview.leads.toInsertCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">New Leads</h3>
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase text-gray-500"><th className="py-1 pr-4">Name</th><th className="py-1 pr-4">Phone</th><th className="py-1 pr-4">Source</th><th className="py-1">Status</th></tr></thead>
                <tbody>
                  {preview.leads.toInsert.map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1 pr-4">{l.customerName}</td>
                      <td className="py-1 pr-4">{l.phone}</td>
                      <td className="py-1 pr-4">{l.source}</td>
                      <td className="py-1">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.costing.vehicleCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">Cost Updates</h3>
              {preview.costing.updates.map((u, i) => (
                <div key={i} className="border-t py-2 text-sm">
                  <div className="font-mono text-xs">{u.vin}</div>
                  {Object.entries(u.deltas).map(([col, delta]) => (
                    <div key={col}>{col}: +${delta.toFixed(2)}</div>
                  ))}
                  {u.notes.map((n, j) => <div key={j} className="text-gray-500">{n}</div>)}
                </div>
              ))}
            </div>
          )}

          {preview.arbitration.vehicleCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">Arbitration/Transport Updates</h3>
              {preview.arbitration.updates.map((u, i) => (
                <div key={i} className="border-t py-2 text-sm">
                  <div className="font-mono text-xs">{u.vin}</div>
                  <div className="text-gray-600">{u.patch.auction as string} — {u.patch.transport_status as string}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="rounded border px-4 py-2 hover:bg-gray-50">
              {totalChanges === 0 ? 'Done' : 'Cancel'}
            </button>
            {totalChanges > 0 && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : `Confirm Import (${totalChanges} changes)`}
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="mb-2 text-lg font-bold text-green-800">Import Complete</h2>
          <p className="text-green-700">
            {result.leadsInserted} leads added, {result.vehiclesCostUpdated} vehicles with cost updates, {result.vehiclesArbitrationUpdated} vehicles with arbitration/transport updates.
          </p>
          <button onClick={reset} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
