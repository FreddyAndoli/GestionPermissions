'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, FileDown, Upload, Eye, EyeOff } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import SearchBar from '@/components/ui/SearchBar';
import Modal from '@/components/ui/Modal';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const canReadUsers = hasPermission('users.read');
  const canReadDepts = hasPermission('departments.read');
  const canReadRoles = hasPermission('roles.read');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get(`/users?page=${page}&search=${encodeURIComponent(search)}`);
      return data;
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    enabled: canReadDepts,
    queryFn: async () => {
      const { data } = await apiClient.get('/departments?limit=1000');
      return data || [];
    }
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles-list-users'],
    enabled: canReadRoles,
    queryFn: async () => {
      const { data } = await apiClient.get('/roles?limit=1000');
      return data || [];
    }
  });

  const createUser = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      await apiClient.post('/users', {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || undefined,
        password,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        roleIds: selectedRoleIds.length > 0 ? selectedRoleIds : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setCreatedInfo({ email, password });
      setModalOpen(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setPassword('');
      setConfirmPassword('');
      setPwdError('');
      setShowPassword(false);
      setDepartmentId('');
      setSelectedRoleIds([]);
    },
    onError: (err: any) => {
      setPwdError(err.message || 'Erreur lors de la creation');
    }
  });

  const bulkImport = useMutation({
    mutationFn: async () => {
      const lines = bulkText.split('\n').filter(l => l.trim());
      const users = lines.map(line => {
        const [email, firstName, lastName, password, roleName] = line.split(',').map(s => s.trim());
        const role = roleName ? (roles.find((r: any) => r.name.toLowerCase() === roleName.toLowerCase()) || departments.find((d: any) => false)) : undefined;
        return { email, firstName, lastName, password, roleIds: role ? [role.id] : undefined };
      }).filter(u => u.email && u.firstName);
      const { data } = await apiClient.post('/users/bulk', { users });
      return data;
    },
    onSuccess: (data) => {
      setBulkResult(data);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const columns = [
    { key: 'firstName', label: 'Prenom' },
    { key: 'lastName', label: 'Nom' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Statut',
      render: (row: any) => <StatusBadge status={row.status} />
    }
  ];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Utilisateurs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await apiClient.get('/users/export/csv', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'utilisateurs.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
              } catch {
                // ignore
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50"
          >
            <FileDown size={14} /> CSV
          </button>
          <button
            onClick={() => setBulkModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50"
          >
            <Upload size={14} /> Importer
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>
      {createdInfo && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start justify-between gap-4">
          <div className="text-sm text-green-800 dark:text-green-300">
            <p className="font-semibold">Utilisateur cree avec succes</p>
            <p>L utilisateur peut se connecter avec : <strong>{createdInfo.email}</strong> / <strong>{createdInfo.password}</strong></p>
          </div>
          <button
            onClick={() => setCreatedInfo(null)}
            className="text-green-700 dark:text-green-400 hover:text-green-900 text-sm font-medium"
          >
            Fermer
          </button>
        </div>
      )}
      <div className="mb-4 max-w-sm">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} />
      </div>
      {isLoading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          pagination={data?.pagination}
          onPageChange={setPage}
          onRowClick={(row) => router.push(`/users/${row.id}`)}
        />
      )}

      <Modal open={bulkModalOpen} onClose={() => { setBulkModalOpen(false); setBulkResult(null); setBulkText(''); }} title="Import en masse">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Collez une liste au format CSV (une ligne par utilisateur) :<br/>
            <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1 rounded">email, prenom, nom, mot_de_passe, role</code>
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={8}
            placeholder="jean@exemple.com, Jean, Dupont, password123, Employe&#10;marie@exemple.com, Marie, Martin, password123, Manager"
            className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none font-mono resize-none"
          />
          {bulkResult && (
            <div className="text-sm space-y-1">
              <p className="text-green-600 dark:text-green-400"><strong>{bulkResult.created}</strong> utilisateur(s) cree(s)</p>
              {bulkResult.errors?.length > 0 && (
                <div className="text-red-600 dark:text-red-400">
                  <p><strong>{bulkResult.errors.length}</strong> erreur(s) :</p>
                  <ul className="list-disc list-inside text-xs">
                    {bulkResult.errors.map((err: any, i: number) => (
                      <li key={i}>{err.email} — {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setBulkModalOpen(false); setBulkResult(null); setBulkText(''); }}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Fermer
            </button>
            <button
              onClick={() => bulkImport.mutate()}
              disabled={bulkImport.isPending || !bulkText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {bulkImport.isPending ? 'Import...' : 'Importer'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setPassword(''); setConfirmPassword(''); setShowPassword(false); setPwdError(''); setPhoneNumber(''); }} title="Ajouter un utilisateur">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Prenom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telephone</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mot de passe <span className="text-red-500">*</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwdError(''); }}
                placeholder="Min. 6 caracteres"
                minLength={6}
                required
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-[26px] text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirmer le mot de passe <span className="text-red-500">*</span></label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(''); }}
                placeholder="Repeter le mot de passe"
                minLength={6}
                required
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-[26px] text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Departement</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              >
                <option value="">Aucun</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Roles</label>
              <select
                multiple
                value={selectedRoleIds.map(String)}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map(o => parseInt(o.value));
                  setSelectedRoleIds(opts);
                }}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                size={3}
              >
                {roles.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Maintenez Ctrl pour selectionner plusieurs</p>
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
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !firstName || !lastName || !email || !password || !confirmPassword}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {createUser.isPending ? 'Creation...' : 'Creer'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
