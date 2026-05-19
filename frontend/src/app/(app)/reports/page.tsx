'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import { FileText, Download, Loader2, Trash2, FileDown, Clock } from 'lucide-react';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface GeneratedReport {
  reportId: string;
  downloadUrl: string;
  type: string;
  period: string;
  year: number;
  createdAt: string;
}

const STORAGE_KEY = 'pm-generated-reports';

function loadReports(): GeneratedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReports(reports: GeneratedReport[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(0, 20)));
}

export default function ReportsPage() {
  const { hasPermission } = usePermissions();
  const canReadReports = hasPermission('reports.read');

  const [type, setType] = useState('leaves');
  const [period, setPeriod] = useState('year');
  const [year, setYear] = useState(new Date().getFullYear());
  const [reports, setReports] = useState<GeneratedReport[]>(loadReports);

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
      const newReport: GeneratedReport = {
        reportId: data.reportId,
        downloadUrl: data.downloadUrl,
        type,
        period,
        year,
        createdAt: new Date().toISOString()
      };
      const next = [newReport, ...reports];
      setReports(next);
      saveReports(next);
    }
  });

  const removeReport = (reportId: string) => {
    const next = reports.filter((r) => r.reportId !== reportId);
    setReports(next);
    saveReports(next);
  };

  const typeLabel = (t: string) => (t === 'leaves' ? 'Conges' : t === 'audit' ? 'Audit' : t);
  const periodLabel = (p: string) => (p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Annee');

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Rapports</h1>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileDown size={20} /> Generer un rapport
        </h2>
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
          {generateMutation.isPending ? 'Generation...' : 'Generer le PDF'}
        </button>
      </div>

      {reports.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={20} /> Rapports generes ({reports.length})
          </h2>
          <div className="space-y-3">
            {reports.map((r) => (
              <div
                key={r.reportId}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeLabel(r.type)} - {periodLabel(r.period)} {r.year}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {r.reportId} · {new Date(r.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={r.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <Download size={14} /> Telecharger
                  </a>
                  <button
                    onClick={() => removeReport(r.reportId)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Retirer de l'historique"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700">
          <FileText size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Aucun rapport genere pour l'instant.</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
            Choisissez un type, une periode et une annee, puis cliquez sur Generer.
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
