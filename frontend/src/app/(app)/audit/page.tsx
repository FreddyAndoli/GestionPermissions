'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import SearchBar from '@/components/ui/SearchBar';
import { FileDown, FileText } from 'lucide-react';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { hasPermission } = usePermissions();

  const canReadAudit = hasPermission('audit.read');

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, action],
    enabled: canReadAudit,
    queryFn: async () => {
      const { data } = await apiClient.get(`/audit?page=${page}&action=${encodeURIComponent(action)}`);
      return data;
    }
  });

  const columns = [
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Entite' },
    { key: 'comment', label: 'Commentaire' },
    { key: 'createdAt', label: 'Date', render: (row: any) => new Date(row.createdAt).toLocaleString() }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal d audit</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await apiClient.get(`/audit/export/csv?page=${page}&action=${encodeURIComponent(action)}`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'audit.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch {
                // ignore
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50"
          >
            <FileDown size={14} /> CSV
          </button>
          <button
            onClick={async () => {
              try {
                const { data } = await apiClient.post('/reports/generate', { type: 'audit', action });
                const res = await apiClient.get(data.downloadUrl, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', data.reportId || 'audit.pdf');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch {
                // ignore
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50"
          >
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>
      <div className="mb-4 max-w-sm">
        <SearchBar value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Filtrer par action..." />
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          pagination={data?.pagination}
          onPageChange={setPage}
        />
      )}
    </PageWrapper>
  );
}
