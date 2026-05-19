'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoveRight, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { SkeletonTable } from '@/components/ui/Skeleton';

interface DeptItem {
  id: number;
  name: string;
  description?: string;
  type?: string;
  memberCount?: number;
  manager?: { firstName: string; lastName: string } | null;
  director?: { firstName: string; lastName: string } | null;
  departmentId?: number;
  departmentName?: string;
  isSub: boolean;
}

const groupTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    department: 'Departement',
    team: 'Equipe',
    unit: 'Unite',
    group: 'Groupe',
    branch: 'Succursale'
  };
  return labels[type] || type;
};

const groupTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    department: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    team: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    unit: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    group: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    branch: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
  };
  return colors[type] || 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
};

export default function DepartmentsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSubDept, setTransferSubDept] = useState<DeptItem | null>(null);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DeptItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');
  const [directorId, setDirectorId] = useState('');
  const [deptType, setDeptType] = useState<'main' | 'sub'>('main');
  const [groupType, setGroupType] = useState('department');
  const [parentDeptId, setParentDeptId] = useState('');
  const [newParentDeptId, setNewParentDeptId] = useState('');

  const canReadDepts = hasPermission('departments.read');
  const canReadUsers = hasPermission('users.read');
  const canReadRoles = hasPermission('roles.read');

  const { data: deptsRaw = [], isLoading: deptsLoading } = useQuery({
    queryKey: ['departments'],
    enabled: canReadDepts,
    queryFn: async () => {
      const { data } = await apiClient.get('/departments');
      return (data || []).map((d: any) => ({ ...d, isSub: false }));
    }
  });

  const { data: subDeptsRaw = [], isLoading: subsLoading } = useQuery({
    queryKey: ['sub-departments-all'],
    enabled: canReadDepts && deptsRaw.length > 0,
    queryFn: async () => {
      const allSubs: any[] = [];
      for (const d of deptsRaw) {
        const { data } = await apiClient.get(`/sub-departments/by-department/${d.id}`);
        if (data) {
          data.forEach((s: any) => allSubs.push({
            ...s,
            isSub: true,
            departmentId: d.id,
            departmentName: d.name
          }));
        }
      }
      return allSubs;
    }
  });

  const allRows: DeptItem[] = [...deptsRaw, ...subDeptsRaw];

  const { data: users = [] } = useQuery({
    queryKey: ['users-list-dept'],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get('/users?limit=1000');
      return data.data || [];
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list-dept'],
    enabled: canReadRoles,
    queryFn: async () => {
      const { data } = await apiClient.get('/roles?limit=1000');
      return data || [];
    }
  });

  const createDept = useMutation({
    mutationFn: async () => {
      if (deptType === 'sub') {
        await apiClient.post('/sub-departments', {
          name,
          description,
          departmentId: parentDeptId ? parseInt(parentDeptId) : undefined,
          managerId: managerId ? parseInt(managerId) : undefined
        });
      } else {
        await apiClient.post('/departments', {
          name,
          description,
          type: groupType,
          managerId: managerId ? parseInt(managerId) : undefined,
          directorId: directorId ? parseInt(directorId) : undefined
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['sub-departments-all'] });
      setModalOpen(false);
      resetForm();
    }
  });

  const transferSubDeptMutation = useMutation({
    mutationFn: async () => {
      if (!transferSubDept || !newParentDeptId) return;
      await apiClient.put(`/sub-departments/${transferSubDept.id}`, {
        departmentId: parseInt(newParentDeptId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-departments-all'] });
      setTransferModalOpen(false);
      setTransferSubDept(null);
      setNewParentDeptId('');
    }
  });

  const updateDeptRoles = useMutation({
    mutationFn: async () => {
      if (!selectedDept) return;
      await apiClient.put(`/departments/${selectedDept.id}/roles`, {
        roleIds: selectedRoleIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setRolesModalOpen(false);
      setSelectedDept(null);
      setSelectedRoleIds([]);
    }
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setManagerId('');
    setDirectorId('');
    setDeptType('main');
    setGroupType('department');
    setParentDeptId('');
  };

  const openRolesModal = async (dept: DeptItem) => {
    setSelectedDept(dept);
    try {
      const { data } = await apiClient.get(`/departments/${dept.id}`);
      setSelectedRoleIds(data.roles?.map((r: any) => r.id) || []);
    } catch {
      setSelectedRoleIds([]);
    }
    setRolesModalOpen(true);
  };

  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row: DeptItem) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.isSub ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : groupTypeColor(row.type || 'department')}`}>
          {row.isSub ? 'Sous-dept' : groupTypeLabel(row.type || 'department')}
        </span>
      )
    },
    { key: 'name', label: 'Nom' },
    {
      key: 'parent',
      label: 'Departement parent',
      render: (row: DeptItem) => row.isSub ? (row.departmentName || '-') : '-'
    },
    { key: 'description', label: 'Description' },
    {
      key: 'memberCount',
      label: 'Membres',
      render: (row: DeptItem) => row.memberCount || 0
    },
    {
      key: 'director',
      label: 'Directeur',
      render: (row: DeptItem) => row.director ? `${row.director.firstName} ${row.director.lastName}` : '-'
    },
    {
      key: 'manager',
      label: 'Manager',
      render: (row: DeptItem) => row.manager ? `${row.manager.firstName} ${row.manager.lastName}` : '-'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: DeptItem) => (
        <div className="flex items-center gap-2">
          {!row.isSub && (
            <button
              onClick={() => openRolesModal(row)}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              title="Gerer les roles"
            >
              <ShieldCheck size={12} /> Roles
            </button>
          )}
          {row.isSub ? (
            <button
              onClick={() => { setTransferSubDept(row); setTransferModalOpen(true); }}
              className="text-xs flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <MoveRight size={12} /> Transferer
            </button>
          ) : null}
        </div>
      )
    }
  ];

  const isLoading = deptsLoading || subsLoading;

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groupes & Departements</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>
      {isLoading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : (
        <DataTable columns={columns} data={allRows} />
      )}

      {/* Modal creation */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un groupe">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type de groupe</label>
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="department">Departement</option>
              <option value="team">Equipe</option>
              <option value="unit">Unite</option>
              <option value="group">Groupe</option>
              <option value="branch">Succursale</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Structure</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="deptType"
                  value="main"
                  checked={deptType === 'main'}
                  onChange={() => setDeptType('main')}
                  className="accent-indigo-600"
                />
                Principal
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="deptType"
                  value="sub"
                  checked={deptType === 'sub'}
                  onChange={() => setDeptType('sub')}
                  className="accent-indigo-600"
                />
                Sous-departement
              </label>
            </div>
          </div>

          {deptType === 'sub' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Departement parent *</label>
              <select
                value={parentDeptId}
                onChange={(e) => setParentDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              >
                <option value="">Choisir...</option>
                {deptsRaw.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom *</label>
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

          {deptType === 'main' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Directeur</label>
              <select
                value={directorId}
                onChange={(e) => setDirectorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              >
                <option value="">Aucun</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Manager</label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="">Aucun</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
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
              onClick={() => createDept.mutate()}
              disabled={createDept.isPending || !name || (deptType === 'sub' && !parentDeptId)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createDept.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal transfert */}
      <Modal open={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transferer le sous-departement">
        {transferSubDept && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Transferer <strong>{transferSubDept.name}</strong> vers un autre departement :
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nouveau departement parent *</label>
              <select
                value={newParentDeptId}
                onChange={(e) => setNewParentDeptId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              >
                <option value="">Choisir...</option>
                {deptsRaw
                  .filter((d: any) => d.id !== transferSubDept.departmentId)
                  .map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTransferModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={() => transferSubDeptMutation.mutate()}
                disabled={transferSubDeptMutation.isPending || !newParentDeptId}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {transferSubDeptMutation.isPending ? 'Transfert...' : 'Transferer'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal roles */}
      <Modal open={rolesModalOpen} onClose={() => setRolesModalOpen(false)} title={selectedDept ? `Roles - ${selectedDept.name}` : 'Roles'}>
        {selectedDept && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Selectionnez les roles herites par tous les membres de ce groupe.
            </p>
            <div className="max-h-64 overflow-y-auto border dark:border-slate-600 rounded-lg divide-y dark:divide-slate-600">
              {roles.filter((r: any) => r.name !== 'Super Admin').map((r: any) => (
                <label key={r.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds(prev => [...prev, r.id]);
                      } else {
                        setSelectedRoleIds(prev => prev.filter(id => id !== r.id));
                      }
                    }}
                    className="accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{r.description || '-'}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRolesModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={() => updateDeptRoles.mutate()}
                disabled={updateDeptRoles.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {updateDeptRoles.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
