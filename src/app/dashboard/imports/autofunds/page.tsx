'use client';

import { useState, useRef } from 'react';

const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

interface PreviewUpdate {
  vin: string;
  priceFrom: number | null;
  priceTo: number | null;
  milesFrom: number | null;
  milesTo: number | null;
  colorFrom: string | null;
  colorTo: string | null;
}

interface PreviewConflict {
  vin: string;
  reason: string;
  priceFrom: number | null;
  priceTo: number | null;
  milesFrom: number | null;
  milesTo: number | null;
}

interface PreviewSkipped {
  rowNumber: number;
  vin: string;
  reason: string;
}

interface Preview {
  newCount: number;
  updateCount: number;
  soldCount: number;
  conflictCount: number;
  skippedCount: number;
  updates: PreviewUpdate[];
  sold: { vin: string }[];
  conflicts: PreviewConflict[];
  skipped: PreviewSkipped[];
}

export default function AutofundsImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ inserted: number; updated: number; markedSold: number; conflicts: number } | null>(null);
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

    const res = await fetch('/api/imports/autofunds', { method: 'POST', body: formData });
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

    const res = await fetch('/api/imports/autofunds', { method: 'POST', body: formData });
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

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Import AutoFunds Inventory</h1>
      <p className="mb-6 text-gray-600">Upload the latest AutoFunds export to sync inventory.</p>

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
          <p className="text-gray-600">{loading ? 'Parsing...' : 'Drag & drop the AutoFunds .xls export here, or tap to browse'}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.html"
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
          {preview.newCount + preview.updateCount + preview.soldCount + preview.conflictCount + preview.skippedCount === 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              ✓ Inventory already up to date — no changes found. This file matches what&apos;s already in the system, nothing to import.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-lg bg-white p-4 shadow"><div className="text-2xl font-bold text-green-600">{preview.newCount}</div><div className="text-xs text-gray-500">New</div></div>
            <div className="rounded-lg bg-white p-4 shadow"><div className="text-2xl font-bold text-blue-600">{preview.updateCount}</div><div className="text-xs text-gray-500">Updated</div></div>
            <div className="rounded-lg bg-white p-4 shadow"><div className="text-2xl font-bold text-gray-600">{preview.soldCount}</div><div className="text-xs text-gray-500">Marked Sold</div></div>
            <div className="rounded-lg bg-white p-4 shadow"><div className="text-2xl font-bold text-orange-600">{preview.conflictCount}</div><div className="text-xs text-gray-500">Conflicts</div></div>
            <div className="rounded-lg bg-white p-4 shadow"><div className="text-2xl font-bold text-red-600">{preview.skippedCount}</div><div className="text-xs text-gray-500">Skipped</div></div>
          </div>

          {preview.conflictCount > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
              <h3 className="mb-2 font-semibold text-orange-800">Conflicts — manually edited vehicles (not touched by this import)</h3>
              <p className="mb-3 text-sm text-orange-700">These vehicles were edited by a person since the last import. Review manually if AutoFunds&apos; price/mileage should win instead.</p>
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase text-orange-700"><th className="py-1 pr-4">VIN</th><th className="py-1 pr-4">Price (DB → Import)</th><th className="py-1">Miles (DB → Import)</th></tr></thead>
                <tbody>
                  {preview.conflicts.map((c) => (
                    <tr key={c.vin} className="border-t border-orange-200">
                      <td className="py-1 pr-4 font-mono text-xs">{c.vin}</td>
                      <td className="py-1 pr-4">${c.priceFrom?.toLocaleString()} → ${c.priceTo?.toLocaleString()}</td>
                      <td className="py-1">{c.milesFrom?.toLocaleString()} → {c.milesTo?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.updateCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">Price/Mileage/Color Updates</h3>
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase text-gray-500"><th className="py-1 pr-4">VIN</th><th className="py-1 pr-4">Price</th><th className="py-1 pr-4">Miles</th><th className="py-1">Color</th></tr></thead>
                <tbody>
                  {preview.updates.map((u) => (
                    <tr key={u.vin} className="border-t">
                      <td className="py-1 pr-4 font-mono text-xs">{u.vin}</td>
                      <td className="py-1 pr-4">${u.priceFrom?.toLocaleString()} → ${u.priceTo?.toLocaleString()}</td>
                      <td className="py-1 pr-4">{u.milesFrom?.toLocaleString()} → {u.milesTo?.toLocaleString()}</td>
                      <td className="py-1">{u.colorFrom} → {u.colorTo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.soldCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">Will Be Marked Sold</h3>
              <p className="text-sm text-gray-500">In our database but no longer in this AutoFunds export.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.sold.map((s) => (
                  <span key={s.vin} className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">{s.vin}</span>
                ))}
              </div>
            </div>
          )}

          {preview.skippedCount > 0 && (
            <div className="rounded-lg bg-white p-4 shadow">
              <h3 className="mb-2 font-semibold text-gray-900">Skipped Rows</h3>
              <ul className="text-sm text-gray-600">
                {preview.skipped.map((s, i) => (
                  <li key={i}>Row {s.rowNumber}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="rounded border px-4 py-2 hover:bg-gray-50">
              {preview.newCount + preview.updateCount + preview.soldCount === 0 ? 'Done' : 'Cancel'}
            </button>
            {preview.newCount + preview.updateCount + preview.soldCount > 0 && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Importing...' : `Confirm Import (${preview.newCount + preview.updateCount + preview.soldCount} changes)`}
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="mb-2 text-lg font-bold text-green-800">Import Complete</h2>
          <p className="text-green-700">
            {result.inserted} new, {result.updated} updated, {result.markedSold} marked sold
            {result.conflicts > 0 && `, ${result.conflicts} conflicts skipped for manual review`}.
          </p>
          <button onClick={reset} className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
