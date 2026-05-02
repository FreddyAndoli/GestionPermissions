'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';

export default function UserPermissionsPanel({ userId }: { userId: number }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [permissionId, setPermissionId] = useState('');
  const [granted, setGranted] = useState(true);
  const [comment, setComment] = useState('');

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/user-permissions/${userId}`);
      return data;
    }
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions?limit=1000');
      return data || [];
    }
  });

  const setPermission = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/user-permissions/${userId}`, {
        permissionId: parseInt(permissionId),
        granted,
        comment: comment || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      setModalOpen(false);
      setPermissionId('');
      setGranted(true);
      setComment('');
    }
  });

  const deletePermission = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/user-permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
    }
  });

  const columns = [
    { key: 'permissionName', label: 'Permission' },
    { key: 'permissionSlug', label: 'Slug' },
    {
      key: 'granted',
      label: 'Accorde',
      render: (row: any) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            row.granted
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {row.granted ? 'Oui' : 'Non'}
        </span>
      )
    },
    { key: 'comment', label: 'Commentaire' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => deletePermission.mutate(row.id)}
          className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
          title="Supprimer"
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  const availablePermissions = allPermissions.filter(
    (p: any) => !userPermissions.find((up: any) => up.permissionId === p.id)
  );

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions directes</h3>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      <DataTable columns={columns} data={userPermissions} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Attribuer une permission">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Permission</label>
            <select
              value={permissionId}
              onChange={(e) => setPermissionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {availablePermissions.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-slate-300">Accorder</span>
            <button
              onClick={() => setGranted(!granted)}
              className={`relative w-10 h-6 rounded-full transition-colors ${granted ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${granted ? 'translate-x-4' : ''}`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Commentaire</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
              onClick={() => setPermission.mutate()}
              disabled={setPermission.isPending || !permissionId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {setPermission.isPending ? 'Attribution...' : 'Attribuer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
