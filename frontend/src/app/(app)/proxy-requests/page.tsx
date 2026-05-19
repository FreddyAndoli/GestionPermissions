'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { HandHelping, Check, X, Trash2, Info, Upload, FileText } from 'lucide-react';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface ProxyRequest {
  id: number;
  beneficiaryUser: { id: number; firstName: string; lastName: string; email: string };
  proxyUser: { id: number; firstName: string; lastName: string; email: string };
  permission: { id: number; name: string; slug: string };
  reason?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  beneficiaryConfirmed: string;
  createdAt: string;
}

export default function ProxyRequestsPage() {
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [permissionId, setPermissionId] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();

  const canReadProxy = hasPermission('proxy_requests.read');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['proxy-requests'],
    enabled: canReadProxy,
    queryFn: async () => {
      const { data } = await apiClient.get('/proxy-requests');
      return data as ProxyRequest[];
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-proxy'],
    queryFn: async () => {
      const { data } = await apiClient.get('/users/colleagues?limit=1000');
      return data.data || [];
    }
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions-public'],
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions/public');
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('beneficiaryUserId', beneficiaryId);
      formData.append('permissionId', permissionId);
      if (reason) formData.append('reason', reason);
      if (attachment) formData.append('attachment', attachment);
      await apiClient.post('/proxy-requests', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-requests'] });
      setBeneficiaryId('');
      setPermissionId('');
      setReason('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const proxyError = createMutation.error as any;

  const confirmMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiClient.put(`/proxy-requests/${id}/confirm`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-requests'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/proxy-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-requests'] });
    }
  });

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'proxyUser',
      label: 'Mandataire',
      render: (row: ProxyRequest) => `${row.proxyUser?.firstName || ''} ${row.proxyUser?.lastName || ''}`
    },
    {
      key: 'beneficiaryUser',
      label: 'Beneficiaire',
      render: (row: ProxyRequest) => `${row.beneficiaryUser?.firstName || ''} ${row.beneficiaryUser?.lastName || ''}`
    },
    {
      key: 'permission',
      label: 'Permission',
      render: (row: ProxyRequest) => row.permission?.name || '-'
    },
    {
      key: 'attachment',
      label: 'Justificatif',
      render: (row: ProxyRequest) =>
        row.attachmentUrl ? (
          <a
            href={row.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400"
          >
            <FileText size={12} /> {row.attachmentName || 'Voir'}
          </a>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )
    },
    {
      key: 'beneficiaryConfirmed',
      label: 'Statut',
      render: (row: ProxyRequest) => <StatusBadge status={row.beneficiaryConfirmed} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: ProxyRequest) => (
        <div className="flex items-center gap-2">
          {row.beneficiaryConfirmed === 'pending' && (
            <>
              <button
                onClick={() => confirmMutation.mutate({ id: row.id, status: 'confirmed' })}
                className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                title="Confirmer"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => confirmMutation.mutate({ id: row.id, status: 'rejected' })}
                className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                title="Rejeter"
              >
                <X size={14} />
              </button>
            </>
          )}
          <button
            onClick={() => deleteMutation.mutate(row.id)}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Supprimer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <HandHelping size={24} /> Demandes par procuration
      </h1>

      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Comment fonctionne la procuration ?</p>
          <p className="mt-1">
            Un employe peut demander a agir au nom d'un collegue (beneficiaire) pour une permission specifique. Un justificatif (image ou PDF) est obligatoire. Le beneficiaire doit d'abord confirmer, puis un administrateur approuve la demande.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border dark:border-slate-700 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Nouvelle demande</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Beneficiaire *</label>
            <select
              value={beneficiaryId}
              onChange={(e) => setBeneficiaryId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Permission *</label>
            <select
              value={permissionId}
              onChange={(e) => setPermissionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Selectionner...</option>
              {permissions.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Motif</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motif de la demande..."
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Justificatif
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF ou PDF (max 5 Mo)</p>
          </div>
        </div>
        {proxyError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
            {proxyError?.response?.data?.error || proxyError?.message || "Une erreur s'est produite."}
          </div>
        )}
        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !beneficiaryId || !permissionId}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Soumettre
        </button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : (
        <DataTable
          columns={columns}
          data={requests}
          pagination={undefined}
        />
      )}
    </PageWrapper>
  );
}
