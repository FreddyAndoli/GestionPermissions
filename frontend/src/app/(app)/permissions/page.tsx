'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [action, setAction] = useState('');
  const [moduleId, setModuleId] = useState('');

  const canReadPermissions = hasPermission('permissions.read');
  const canReadModules = hasPermission('modules.read');

  const { data, isLoading } = useQuery({
    queryKey: ['permissions'],
    enabled: canReadPermissions,
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions');
      return data;
    }
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules-list-perm'],
    enabled: canReadModules,
    queryFn: async () => {
      const { data } = await apiClient.get('/modules?limit=1000');
      return data || [];
    }
  });

  const createPermission = useMutation({
    mutationFn: async () => {
      await apiClient.post('/permissions', {
        name,
        slug,
        action,
        moduleId: moduleId ? parseInt(moduleId) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      setModalOpen(false);
      setName('');
      setSlug('');
      setAction('');
      setModuleId('');
    }
  });

  const columns = [
    { key: 'slug', label: 'Slug' },
    { key: 'name', label: 'Nom' },
    { key: 'action', label: 'Action' },
    {
      key: 'module',
      label: 'Module',
      render: (row: any) => row.module?.name || '-'
    }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Permissions</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>
      {isLoading ? (
        <SkeletonTable rows={6} columns={3} />
      ) : (
        <DataTable columns={columns} data={data || []} />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter une permission">
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
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Action</label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Module</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Aucun</option>
              {modules.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createPermission.mutate()}
              disabled={createPermission.isPending || !name || !slug || !action}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createPermission.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
