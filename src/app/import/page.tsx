'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiMutate } from '@/lib/fetcher';

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('HV - BROOKLYN');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped);
      setError(null);
    } else {
      setError('Please upload an Excel file (.xlsx)');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectName', projectName);

      const data = await apiMutate('/api/import', {
        method: 'POST',
        body: formData,
      });

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-2">Import inTakt Schedule</h2>
      <p className="text-gray-600 mb-6">
        Upload the XLSX export from inTakt. The full schedule will be imported and you can filter by week in the app.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <div>
              <div className="text-blue-600 font-medium">{file.name}</div>
              <div className="text-sm text-gray-500 mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 text-4xl mb-2">📁</div>
              <div className="text-gray-600">Drop your inTakt XLSX file here</div>
              <div className="text-sm text-gray-400 mt-1">or click to browse</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={!file || uploading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
        >
          {uploading ? 'Importing...' : 'Import Schedule'}
        </button>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-green-800 mb-3">Import Successful</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Activity Groups:</span>
                <span className="font-medium">{result.summary.activities}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tasks:</span>
                <span className="font-medium">{result.summary.tasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Relationships:</span>
                <span className="font-medium">{result.summary.relationships}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Buildings:</span>
                <span className="font-medium">{result.summary.buildings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Zones:</span>
                <span className="font-medium">{result.summary.zones}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Companies:</span>
                <span className="font-medium">{result.summary.companies}</span>
              </div>
              {result.summary.errors > 0 && (
                <div className="flex justify-between col-span-2 text-amber-700">
                  <span>Parse Warnings:</span>
                  <span className="font-medium">{result.summary.errors}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push(`/tracking/schedule/${result.planId}`)}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
            >
              View Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
