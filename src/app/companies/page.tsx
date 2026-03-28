'use client';

import { useEffect, useState } from 'react';

interface Company {
  id: number;
  name: string;
  color: string | null;
  taskCount: number;
}

interface Activity {
  id: number;
  name: string;
  task_code: string | null;
  company_id: number | null;
  companyName: string | null;
  phase_name: string | null;
  taskCount: number;
}

interface TaskCodeGroup {
  code: string;
  name: string;
  companyId: number | null;
  companyName: string | null;
  activityIds: number[];
  taskCount: number;
  buildingCount: number;
  isMixed: boolean; // different companies assigned across buildings
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [tab, setTab] = useState<'codes' | 'companies'>('codes');

  // New company form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Search
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const planRes = await fetch('/tracking/api/plans/1?limit=1');
      if (!planRes.ok) throw new Error('No plan found');
      const planData = await planRes.json();
      setProjectId(planData.plan.project_id);
      setPlanId(planData.plan.id);

      const [compRes, actRes] = await Promise.all([
        fetch(`/tracking/api/companies?projectId=${planData.plan.project_id}`),
        fetch(`/tracking/api/activities?planId=${planData.plan.id}`),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (actRes.ok) setActivities(await actRes.json());
    } catch {
      setError('Failed to load. Import a schedule first.');
    } finally {
      setLoading(false);
    }
  }

  // Group activities by task_code
  const taskCodeGroups: TaskCodeGroup[] = (() => {
    const map = new Map<string, { names: Set<string>; companyIds: Set<string>; companyNames: Set<string>; activityIds: number[]; taskCount: number; phases: Set<string> }>();
    for (const a of activities) {
      const code = a.task_code || `_${a.name}`;
      if (!map.has(code)) {
        map.set(code, { names: new Set(), companyIds: new Set(), companyNames: new Set(), activityIds: [], taskCount: 0, phases: new Set() });
      }
      const g = map.get(code)!;
      g.names.add(a.name);
      g.companyIds.add(String(a.company_id || 'null'));
      g.companyNames.add(a.companyName || 'Unassigned');
      g.activityIds.push(a.id);
      g.taskCount += a.taskCount;
      if (a.phase_name) g.phases.add(a.phase_name);
    }

    return Array.from(map.entries()).map(([code, g]) => {
      const companyIds = Array.from(g.companyIds).filter((c) => c !== 'null');
      const uniqueCompanyIds = new Set(companyIds);
      const isMixed = uniqueCompanyIds.size > 1;
      const mainCompanyId = companyIds.length > 0 ? parseInt(companyIds[0]) : null;
      const mainCompanyName = Array.from(g.companyNames).filter((n) => n !== 'Unassigned')[0] || 'Unassigned';

      return {
        code: code.startsWith('_') ? '' : code,
        name: Array.from(g.names)[0],
        companyId: isMixed ? null : mainCompanyId,
        companyName: isMixed ? 'Mixed' : mainCompanyName,
        activityIds: g.activityIds,
        taskCount: g.taskCount,
        buildingCount: g.phases.size,
        isMixed,
      };
    }).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  })();

  // Filter
  const filteredCodes = search
    ? taskCodeGroups.filter((g) =>
        g.code.toLowerCase().includes(search.toLowerCase()) ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.companyName || '').toLowerCase().includes(search.toLowerCase())
      )
    : taskCodeGroups;

  async function handleCreate() {
    if (!newName.trim() || !projectId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/tracking/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor.replace('#', ''), project_id: projectId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setNewName('');
      setShowForm(false);
      const compRes = await fetch(`/tracking/api/companies?projectId=${projectId}`);
      if (compRes.ok) setCompanies(await compRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(id: number) {
    try {
      await fetch(`/tracking/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor.replace('#', '') }),
      });
      setEditingId(null);
      const compRes = await fetch(`/tracking/api/companies?projectId=${projectId}`);
      if (compRes.ok) setCompanies(await compRes.json());
    } catch {
      setError('Failed to update');
    }
  }

  async function handleReassignCode(group: TaskCodeGroup, newCompanyId: number | null) {
    setError(null);
    try {
      // Reassign ALL activities with this task code
      for (const actId of group.activityIds) {
        await fetch(`/tracking/api/activities/${actId}/company`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company_id: newCompanyId }),
        });
      }
      // Refresh
      const [compRes, actRes] = await Promise.all([
        fetch(`/tracking/api/companies?projectId=${projectId}`),
        fetch(`/tracking/api/activities?planId=${planId}`),
      ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (actRes.ok) setActivities(await actRes.json());
    } catch {
      setError('Failed to reassign');
    }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Company Management</h2>
        <p className="text-sm text-gray-500">Assign companies to task codes — same code = same trade across all buildings</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 min-w-[44px] min-h-[44px] flex items-center justify-center">Dismiss</button>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setTab('codes')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition min-h-[44px] ${tab === 'codes' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          Task Codes ({taskCodeGroups.length})
        </button>
        <button onClick={() => setTab('companies')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition min-h-[44px] ${tab === 'companies' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          Companies ({companies.length})
        </button>
      </div>

      {/* ─── TAB: Task Codes ─────────────────────────────── */}
      {tab === 'codes' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, task name, or company..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm min-h-[44px]"
            />
            <p className="text-xs text-gray-400 mt-2">Each task code represents a specific trade. Changing the company here updates all buildings.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-20">Code</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Task Name</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-600 w-20">Tasks</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-52">Company</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCodes.map((group) => (
                  <tr key={group.code || group.name} className={`hover:bg-gray-50 ${group.isMixed ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-gray-700">{group.code || '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{group.name}</div>
                      {group.isMixed && (
                        <div className="text-xs text-amber-600 mt-0.5">Mixed assignments across buildings — select to unify</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{group.taskCount}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={group.companyId || ''}
                        onChange={(e) => handleReassignCode(group, e.target.value ? parseInt(e.target.value) : null)}
                        className={`w-full px-3 py-2 border rounded-lg text-xs min-h-[40px] bg-white ${group.isMixed ? 'border-amber-300' : 'border-gray-200'}`}
                      >
                        <option value="">— Unassigned —</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCodes.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">No matching task codes</div>
          )}
        </div>
      )}

      {/* ─── TAB: Companies ──────────────────────────────── */}
      {tab === 'companies' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Companies</h3>
            <button onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 min-h-[44px]">
              + New Company
            </button>
          </div>

          {showForm && (
            <div className="px-4 py-4 border-b border-gray-200 bg-blue-50/50">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g., Smith Electrical"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm min-h-[44px]" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                    className="w-11 h-11 rounded-lg border border-gray-300 cursor-pointer" />
                </div>
                <button onClick={handleCreate} disabled={!newName.trim() || creating}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px]">
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => { setShowForm(false); setNewName(''); }}
                  className="px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm min-h-[44px]">Cancel</button>
              </div>
            </div>
          )}

          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {companies.map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                {editingId === c.id ? (
                  <>
                    <input type="color" value={`#${editColor}`} onChange={(e) => setEditColor(e.target.value.replace('#', ''))}
                      className="w-9 h-9 rounded border border-gray-200 cursor-pointer flex-shrink-0" />
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(c.id)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" autoFocus />
                    <button onClick={() => handleUpdate(c.id)} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs min-h-[36px]">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-2 text-gray-500 text-xs min-h-[36px]">Cancel</button>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full flex-shrink-0 border border-gray-200" style={{ backgroundColor: c.color ? `#${c.color}` : '#9ca3af' }} />
                    <span className="flex-1 font-medium text-sm">{c.name}</span>
                    <span className="text-xs text-gray-400 tabular-nums">{c.taskCount} tasks</span>
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditColor(c.color || '9ca3af'); }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded min-h-[36px]">Edit</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
