'use client';

import { useState } from 'react';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';

export default function SimulatorPage() {
  const [userId, setUserId] = useState('');
  const [permissionSlug, setPermissionSlug] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.post('/simulator', { userId: parseInt(userId), permissionSlug });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Simulateur de permissions</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700 max-w-xl space-y-4">
        <div>
          <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">ID Utilisateur</label>
          <input
            type="number"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 dark:text-slate-400 mb-1">Permission (slug)</label>
          <input
            type="text"
            value={permissionSlug}
            onChange={(e) => setPermissionSlug(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
          />
        </div>
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? 'Simulation...' : 'Simuler'}
        </button>
        {result && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm">
              Resultat: {result.granted ? (
                <span className="text-green-600 font-semibold">Autorise</span>
              ) : (
                <span className="text-red-600 font-semibold">Refuse</span>
              )}
            </p>
            {result.resolution && (
              <p className="text-sm text-gray-500 mt-1">Source: {result.resolution.source} — {result.resolution.reason}</p>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
