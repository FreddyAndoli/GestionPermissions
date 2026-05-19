'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';

export default function LeaveTypesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxDaysPerYear, setMaxDaysPerYear] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isPaid, setIsPaid] = useState(true);

  const canReadLeaveTypes = hasPermission('leave_types.read');

  const { data, isLoading } = useQuery({
    queryKey: ['leave-types'],
    enabled: canReadLeaveTypes,
    queryFn: async () => {
      const { data } = await apiClient.get('/leave-types');
      return data;
    }
  });

  const createLeaveType = useMutation({
    mutationFn: async () => {
      await apiClient.post('/leave-types', {
        name,
        description,
        defaultQuota: maxDaysPerYear ? parseInt(maxDaysPerYear) : 0,
        validationMode: requiresApproval ? 'manager' : 'auto_approved',
        isPaid
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      setModalOpen(false);
      setName('');
      setDescription('');
      setMaxDaysPerYear('');
      setRequiresApproval(true);
      setIsPaid(true);
    }
  });

  const deleteLeaveType = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/leave-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
    }
  });

  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'description', label: 'Description' },
    {
      key: 'defaultQuota',
      label: 'Quota par defaut',
      render: (row: any) => row.defaultQuota ?? '-'
    },
    {
      key: 'validationMode',
      label: 'Mode validation',
      render: (row: any) =>
        row.validationMode === 'manager' ? 'Manager' :
        row.validationMode === 'auto_approved' ? 'Auto' : 'Libre'
    },
    {
      key: 'isPaid',
      label: 'Paye',
      render: (row: any) => (row.isPaid ? 'Oui' : 'Non')
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => deleteLeaveType.mutate(row.id)}
          className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Types de conges</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>
      {isLoading ? (
        <SkeletonTable rows={6} columns={5} />
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un type de conge">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jours max par an</label>
            <input
              type="number"
              value={maxDaysPerYear}
              onChange={(e) => setMaxDaysPerYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-slate-300">Necessite approbation</span>
            <button
              onClick={() => setRequiresApproval(!requiresApproval)}
              className={`relative w-10 h-6 rounded-full transition-colors ${requiresApproval ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${requiresApproval ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-slate-300">Conge paye</span>
            <button
              onClick={() => setIsPaid(!isPaid)}
              className={`relative w-10 h-6 rounded-full transition-colors ${isPaid ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isPaid ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createLeaveType.mutate()}
              disabled={createLeaveType.isPending || !name}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createLeaveType.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
