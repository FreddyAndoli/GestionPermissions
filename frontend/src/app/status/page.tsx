'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function StatusPage() {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    apiClient.get('/status').then(r => setStatus(r.data)).catch(() => setStatus({ status: 'error' }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border dark:border-slate-700 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Statut du systeme</h1>
        {!status ? (
          <p className="text-gray-500">Chargement...</p>
        ) : (
          <div className="space-y-3">
            {status.services && Object.entries(status.services).map(([name, svc]: [string, any]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-300 capitalize">{name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${svc.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
