'use client';

import { useEffect, useState } from 'react';

interface DelayWeight {
  id: number;
  project_id: number;
  reason: string;
  weight: number;
  impacts_score: boolean;
  cascading_multiplier: number;
  description: string | null;
}

const REASON_LABELS: Record<string, string> = {
  weather: 'Weather',
  material: 'Material',
  labor: 'Labor',
  prep: 'Preparation',
  design: 'Design',
  inspection: 'Inspection',
  prerequisite: 'Prerequisite (Inherited)',
  other: 'Other',
};

export default function SettingsPage() {
  const [weights, setWeights] = useState<DelayWeight[]>([]);
  const [cascadingMultiplier, setCascadingMultiplier] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [projectId, setProjectId] = useState<number>(1);

  useEffect(() => {
    fetchWeights();
  }, [projectId]);

  async function fetchWeights() {
    setLoading(true);
    try {
      const res = await fetch(`/tracking/api/settings/delay-weights?projectId=${projectId}`);
      const data = await res.json();
      setWeights(data);
      if (data.length > 0) {
        setCascadingMultiplier(data[0].cascading_multiplier ?? 1.5);
      }
    } catch {
      console.error('Failed to fetch delay weights');
    } finally {
      setLoading(false);
    }
  }

  function updateWeight(reason: string, field: 'weight' | 'impacts_score', value: number | boolean) {
    setWeights((prev) =>
      prev.map((w) => (w.reason === reason ? { ...w, [field]: value } : w))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/tracking/api/settings/delay-weights', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          cascadingMultiplier,
          weights: weights.map((w) => ({
            reason: w.reason,
            weight: w.weight,
            impacts_score: w.impacts_score,
          })),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      console.error('Failed to save weights');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Configure delay weights and scoring parameters</p>
      </div>

      {/* Delay Weights */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Delay Reason Weights</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Adjust how much each delay reason impacts the trade score (0 = no impact, 2 = double impact)
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {weights.map((w) => (
            <div key={w.reason} className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {REASON_LABELS[w.reason] || w.reason}
                  </span>
                  {w.description && (
                    <span className="text-xs text-gray-400 ml-2">{w.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={w.impacts_score}
                      onChange={(e) => updateWeight(w.reason, 'impacts_score', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Impacts Score
                  </label>
                  <span className="text-sm font-mono font-bold text-gray-700 w-10 text-right">
                    {w.weight.toFixed(1)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={w.weight}
                onChange={(e) => updateWeight(w.reason, 'weight', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-gray-300 mt-0.5">
                <span>0</span>
                <span>0.5</span>
                <span>1.0</span>
                <span>1.5</span>
                <span>2.0</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cascading Multiplier */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-700">Cascading Impact Multiplier</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Delays that caused other trades to inherit delays get this multiplier applied
          </p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="1"
              max="3"
              step="0.1"
              value={cascadingMultiplier}
              onChange={(e) => {
                setCascadingMultiplier(parseFloat(e.target.value) || 1.0);
                setSaved(false);
              }}
              className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
            />
            <span className="text-sm text-gray-500">x multiplier on delays that cascade to other trades</span>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Settings saved successfully</span>
        )}
      </div>
    </div>
  );
}
