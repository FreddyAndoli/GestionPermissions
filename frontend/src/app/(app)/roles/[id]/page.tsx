'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useRouter } from 'next/navigation';

export default function RoleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);

  const canReadRoles = hasPermission('roles.read');
  const canReadPermissions = hasPermission('permissions.read');

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', id],
    enabled: canReadRoles,
    queryFn: async () => {
      const { data } = await apiClient.get(`/roles/${id}`);
      return data;
    }
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions-all'],
    enabled: canReadPermissions,
    queryFn: async () => {
      const { data } = await apiClient.get('/permissions?limit=1000');
      return data || [];
    }
  });

  useEffect(() => {
    if (role?.permissions) {
      setSelectedPermIds(role.permissions.map((p: any) => p.id));
    }
  }, [role]);

  const updateRole = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/roles/${id}`, {
        permissionIds: selectedPermIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });

  if (isLoading || !role) {
    return (
      <PageWrapper>
        <div className="max-w-3xl mx-auto space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageWrapper>
    );
  }

  // Group permissions by module
  const permsByModule: Record<string, any[]> = {};
  allPermissions.forEach((perm: any) => {
    const modName = perm.module?.name || 'Autres';
    if (!permsByModule[modName]) permsByModule[modName] = [];
    permsByModule[modName].push(perm);
  });

  return (
    <PageWrapper>
      <button
        onClick={() => router.push('/roles')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 mb-4"
      >
        <ArrowLeft size={14} /> Retour aux roles
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{role.name}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{role.description || 'Aucune description'}</p>
        </div>
        <button
          onClick={() => updateRole.mutate()}
          disabled={updateRole.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={14} /> {updateRole.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions associees</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Cochez les permissions que ce role possedera. Tous les utilisateurs ayant ce role heriteront de ces permissions.
        </p>

        <div className="space-y-6">
          {Object.entries(permsByModule).map(([moduleName, perms]) => (
            <div key={moduleName}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wide">{moduleName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {perms.map((perm: any) => {
                  const checked = selectedPermIds.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                          : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedPermIds(prev =>
                            e.target.checked
                              ? [...prev, perm.id]
                              : prev.filter(i => i !== perm.id)
                          );
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{perm.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{perm.slug}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
