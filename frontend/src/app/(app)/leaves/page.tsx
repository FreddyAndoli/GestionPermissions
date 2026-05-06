'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileDown } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';

export default function LeavesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');

  const canReadLeaves = hasPermission('leaves.read');
  const canReadLeaveTypes = hasPermission('leaves.read');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves'],
    enabled: canReadLeaves,
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves');
      return data;
    }
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ['leave-types-list'],
    enabled: canReadLeaveTypes,
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-types?limit=1000');
      return data || [];
    }
  });

  const createLeave = useMutation({
    mutationFn: async () => {
      await apiClient.post('/leaves', {
        startDate,
        endDate,
        reason,
        leaveTypeId: leaveTypeId ? parseInt(leaveTypeId) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setModalOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveTypeId('');
    }
  });

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'status',
      label: 'Statut',
      render: (row: any) => <StatusBadge status={row.status} />
    },
    { key: 'totalDays', label: 'Jours' },
    { key: 'reason', label: 'Motif' }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Conges</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await apiClient.get('/leaves/export/csv', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'conges.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch (err: any) {
                console.error('CSV export error', err);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50"
          >
            <FileDown size={14} /> CSV
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle demande de conge">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Debut</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type de conge</label>
            <select
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {leaveTypes.map((lt: any) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Motif</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createLeave.mutate()}
              disabled={createLeave.isPending || !startDate || !endDate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createLeave.isPending ? 'Creation...' : 'Soumettre'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
