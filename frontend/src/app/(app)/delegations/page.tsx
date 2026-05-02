'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';

export default function DelegationsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [managerId, setManagerId] = useState('');
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const canReadDelegations = hasPermission('leaves.approve');
  const canReadUsers = hasPermission('users.read');

  const { data, isLoading } = useQuery({
    queryKey: ['delegations'],
    enabled: canReadDelegations,
    queryFn: async () => {
      const { data } = await apiClient.get('/delegations');
      return data;
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-delegation'],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get('/users?limit=1000');
      return data.data || [];
    }
  });

  const createDelegation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/delegations', {
        managerId: managerId ? parseInt(managerId) : undefined,
        delegateId: delegateId ? parseInt(delegateId) : undefined,
        startDate,
        endDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delegations'] });
      setModalOpen(false);
      setManagerId('');
      setDelegateId('');
      setStartDate('');
      setEndDate('');
    }
  });

  const columns = [
    { key: 'manager', label: 'Manager', render: (row: any) => `${row.manager?.firstName} ${row.manager?.lastName}` },
    { key: 'delegate', label: 'Delegataire', render: (row: any) => `${row.delegate?.firstName} ${row.delegate?.lastName}` },
    { key: 'startDate', label: 'Debut' },
    { key: 'endDate', label: 'Fin' },
    { key: 'isActive', label: 'Actif', render: (row: any) => (row.isActive ? 'Oui' : 'Non') }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delegations</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle delegation">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Manager</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Delegataire</label>
            <select
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createDelegation.mutate()}
              disabled={createDelegation.isPending || !managerId || !delegateId || !startDate || !endDate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createDelegation.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
