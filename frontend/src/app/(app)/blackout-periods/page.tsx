'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Building2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlackoutPeriod {
  id: number;
  departmentId?: number;
  departmentName?: string;
  startDate: string;
  endDate: string;
  message: string;
  isRecurring: boolean;
  recurrenceRule?: string;
}

interface Department {
  id: number;
  name: string;
}

export default function BlackoutPeriodsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canApprove = hasPermission('leaves.approve');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlackoutPeriod | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['blackout-periods'],
    queryFn: async () => {
      const { data } = await apiClient.get('/blackout-periods');
      return data as BlackoutPeriod[];
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data } = await apiClient.get('/departments?limit=1000');
      return (data?.data || []) as Department[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/blackout-periods', {
        startDate,
        endDate,
        message,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        isRecurring
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-periods'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await apiClient.put(`/blackout-periods/${editing.id}`, {
        startDate,
        endDate,
        message,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        isRecurring
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-periods'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/blackout-periods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blackout-periods'] });
    }
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setStartDate('');
    setEndDate('');
    setMessage('');
    setDepartmentId('');
    setIsRecurring(false);
  };

  const openEdit = (p: BlackoutPeriod) => {
    setEditing(p);
    setStartDate(format(new Date(p.startDate), 'yyyy-MM-dd'));
    setEndDate(format(new Date(p.endDate), 'yyyy-MM-dd'));
    setMessage(p.message);
    setDepartmentId(p.departmentId ? String(p.departmentId) : '');
    setIsRecurring(p.isRecurring);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const columns = [
    { key: 'message', label: 'Message' },
    {
      key: 'startDate',
      label: 'Debut',
      render: (row: BlackoutPeriod) => format(new Date(row.startDate), 'dd MMM yyyy', { locale: fr })
    },
    {
      key: 'endDate',
      label: 'Fin',
      render: (row: BlackoutPeriod) => format(new Date(row.endDate), 'dd MMM yyyy', { locale: fr })
    },
    {
      key: 'departmentName',
      label: 'Departement',
      render: (row: BlackoutPeriod) => row.departmentName || (
        <span className="text-gray-400 italic">Toute l'organisation</span>
      )
    },
    {
      key: 'isRecurring',
      label: 'Recurrent',
      render: (row: BlackoutPeriod) => row.isRecurring ? 'Oui' : 'Non'
    },
    ...(canApprove
      ? [{
          key: 'actions',
          label: 'Actions',
          render: (row: BlackoutPeriod) => (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer cette periode bloquee ?')) deleteMutation.mutate(row.id); }}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )
        }]
      : [])
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Periodes bloquees</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {periods.length} periode{periods.length > 1 ? 's' : ''} enregistree{periods.length > 1 ? 's' : ''}
          </p>
        </div>
        {canApprove && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden shadow-sm">
          <DataTable columns={columns} data={periods} />
        </div>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Modifier' : 'Ajouter une periode bloquee'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              placeholder="Raison du blocage..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Debut</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Departement</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Toute l'organisation</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700 dark:text-slate-300">Recurrent chaque annee</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!message || !startDate || !endDate || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
