'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';

export default function ModulesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  const canReadModules = hasPermission('modules.read');

  const { data, isLoading } = useQuery({
    queryKey: ['modules'],
    enabled: canReadModules,
    queryFn: async () => {
      const { data } = await apiClient.get('/modules');
      return data;
    }
  });

  const createModule = useMutation({
    mutationFn: async () => {
      await apiClient.post('/modules', { name, slug, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      setModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
    }
  });

  const columns = [
    { key: 'name', label: 'Nom' },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description' },
    {
      key: 'isActive',
      label: 'Actif',
      render: (row: any) => (row.isActive ? 'Oui' : 'Non')
    }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modules</h1>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un module">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ex: leave-management"
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
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createModule.mutate()}
              disabled={createModule.isPending || !name || !slug}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createModule.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
