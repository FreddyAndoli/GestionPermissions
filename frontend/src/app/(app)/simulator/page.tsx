'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Monitor, Grid3X3, List, Shield, ShieldCheck, ShieldAlert, Users } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';

interface SimUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface SimPermission {
  id: number;
  slug: string;
  name: string;
  action: string;
}

interface MatrixCell {
  granted: boolean;
  source: string;
}

interface MatrixResponse {
  users: SimUser[];
  permissions: SimPermission[];
  matrix: Record<number, Record<string, MatrixCell>>;
}

export default function SimulatorPage() {
  const { hasPermission } = usePermissions();
  const canSimulate = hasPermission('admin.simulate');

  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [userSearch, setUserSearch] = useState('');
  const [permFilter, setPermFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data, isLoading } = useQuery<MatrixResponse>({
    queryKey: ['simulator-matrix'],
    enabled: canSimulate,
    queryFn: async () => {
      const { data } = await apiClient.get('/simulator/matrix');
      return data;
    }
  });

  if (isLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </PageWrapper>
    );
  }

  if (!canSimulate) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ShieldAlert size={48} className="mb-4 text-red-400" />
          <p>Vous n'avez pas la permission d'acceder au simulateur.</p>
        </div>
      </PageWrapper>
    );
  }

  const users = data?.users || [];
  const permissions = data?.permissions || [];
  const matrix = data?.matrix || {};

  const filteredUsers = users.filter(
    (u) =>
      u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPermissions = permissions.filter((p) =>
    p.slug.toLowerCase().includes(permFilter.toLowerCase()) ||
    p.name.toLowerCase().includes(permFilter.toLowerCase())
  );

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'direct':
        return 'bg-indigo-500';
      case 'role':
        return 'bg-emerald-500';
      case 'department':
        return 'bg-amber-500';
      default:
        return 'bg-gray-200 dark:bg-slate-700';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'direct':
        return 'Direct';
      case 'role':
        return 'Role';
      case 'department':
        return 'Departement';
      default:
        return 'Aucun';
    }
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Monitor size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Simulateur de permissions</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {users.length} utilisateurs · {permissions.length} permissions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('matrix')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'matrix' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}
          >
            <Grid3X3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
          />
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrer les permissions..."
            value={permFilter}
            onChange={(e) => setPermFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500"></span> Direct
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Role
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-500"></span> Departement
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-slate-700"></span> Refuse
        </div>
      </div>

      {viewMode === 'matrix' ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-slate-700/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left font-medium text-gray-500 dark:text-slate-400 px-3 py-2 min-w-[200px] sticky left-0 bg-gray-50 dark:bg-slate-700/50 z-20 border-r dark:border-slate-700">
                    Utilisateur
                  </th>
                  {filteredPermissions.map((p) => (
                    <th
                      key={p.slug}
                      className="text-center font-medium text-gray-500 dark:text-slate-400 px-1 py-2 min-w-[40px] max-w-[100px] truncate"
                      title={p.name}
                    >
                      {p.slug.split('.')[1] || p.slug}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                          {u.firstName[0]}{u.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-gray-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    {filteredPermissions.map((p) => {
                      const cell = matrix[u.id]?.[p.slug];
                      const granted = cell?.granted || false;
                      const source = cell?.source || 'none';
                      return (
                        <td key={p.slug} className="px-1 py-2 text-center">
                          <div
                            className={`w-6 h-6 rounded mx-auto ${granted ? getSourceColor(source) : 'bg-gray-100 dark:bg-slate-700'} ${granted ? 'text-white' : 'text-gray-300'}`}
                            title={`${p.name}: ${granted ? 'Autorise' : 'Refuse'} (${getSourceLabel(source)})`}
                          >
                            {granted ? <ShieldCheck size={14} className="mx-auto mt-0.5" /> : <Shield size={14} className="mx-auto mt-0.5" />}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const userPerms = matrix[u.id] || {};
            const grantedCount = Object.values(userPerms).filter((c) => c.granted).length;
            return (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{u.email} · {grantedCount}/{permissions.length} permissions</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filteredPermissions.map((p) => {
                    const cell = userPerms[p.slug];
                    const granted = cell?.granted || false;
                    const source = cell?.source || 'none';
                    if (!granted) return null;
                    return (
                      <span
                        key={p.slug}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white ${getSourceColor(source)}`}
                        title={`${p.name} (${getSourceLabel(source)})`}
                      >
                        <ShieldCheck size={12} /> {p.slug}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
