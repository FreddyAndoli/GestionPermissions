'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import { FileText, Download, Loader2 } from 'lucide-react';

interface GeneratedReport {
  reportId: string;
  downloadUrl: string;
}

export default function ReportsPage() {
  const { hasPermission } = usePermissions();
  const canReadReports = hasPermission('reports.read');

  const [type, setType] = useState('leaves');
  const [period, setPeriod] = useState('year');
  const [year, setYear] = useState(new Date().getFullYear());
  const [reports, setReports] = useState<GeneratedReport[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/reports/generate', {
        type,
        period,
        year,
        scope: 'organization'
      });
      return data;
    },
    onSuccess: (data) => {
      setReports((prev) => [data, ...prev]);
    }
  });

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rapports</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generer un rapport</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="leaves">Conges</option>
              <option value="audit">Audit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Periode</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="month">Mois</option>
              <option value="quarter">Trimestre</option>
              <option value="year">Annee</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Annee</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          Generer
        </button>
      </div>

      {reports.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rapports generes</h2>
          <ul className="space-y-2">
            {reports.map((r, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <span className="text-sm text-gray-900 dark:text-white">{r.reportId}</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL}${r.downloadUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Download size={14} /> Telecharger
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageWrapper>
  );
}
