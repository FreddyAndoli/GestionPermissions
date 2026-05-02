'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, UserCog, Lock, ShieldCheck } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import StatusBadge from '@/components/ui/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import UserPermissionsPanel from './UserPermissionsPanel';

export default function UserDetailPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const isOwnProfile = currentUser?.id === parseInt(id as string);
  const canReadUsers = hasPermission('users.read') || isOwnProfile;
  const canReadDepts = hasPermission('departments.read');
  const canReadRoles = hasPermission('roles.read');

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    enabled: canReadUsers,
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data;
    }
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list-user'],
    enabled: canReadDepts,
    queryFn: async () => {
      const { data } = await apiClient.get('/departments?limit=1000');
      return data || [];
    }
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ['roles-list-user'],
    enabled: canReadRoles,
    queryFn: async () => {
      const { data } = await apiClient.get('/roles?limit=1000');
      return data || [];
    }
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/users/${id}`, {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNumber || undefined,
        status,
        departmentId: departmentId ? parseInt(departmentId) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditMode(false);
    }
  });

  const updateRoles = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/users/${id}/roles`, { roleIds: selectedRoleIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      if (newPassword.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caracteres');
      }
      await apiClient.post(`/users/${id}/reset-password`, { password: newPassword });
    },
    onSuccess: () => {
      setShowResetPwd(false);
      setNewPassword('');
      setConfirmPassword('');
      setPwdError('');
    },
    onError: (err: any) => {
      setPwdError(err.message || 'Erreur lors de la reinitialisation');
    }
  });

  if (isLoading || !user) return <div className="p-6">Chargement...</div>;

  const canEdit = currentUser?.effectivePermissions?.['users.update'] || currentUser?.id === user.id;
  const isAdmin = currentUser?.effectivePermissions?.['users.update'];

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {user.firstName} {user.lastName}
        </h1>
        {canEdit && (
          <button
            onClick={() => {
              if (!editMode) {
                setFirstName(user.firstName || '');
                setLastName(user.lastName || '');
                setEmail(user.email || '');
                setPhoneNumber(user.phoneNumber || '');
                setStatus(user.status || '');
                setDepartmentId(user.departmentId ? String(user.departmentId) : '');
              }
              setEditMode(!editMode);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserCog size={16} /> {editMode ? 'Annuler' : 'Modifier'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700 space-y-4">
        {editMode ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Prenom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telephone</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="suspended">Suspendu</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
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
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => updateUser.mutate()}
                disabled={updateUser.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {updateUser.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Telephone</p>
              <p className="text-gray-900 dark:text-white">{user.phoneNumber || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Statut</p>
              <StatusBadge status={user.status} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Departement</p>
              <p className="text-gray-900 dark:text-white">{user.department?.name || '-'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500 dark:text-slate-400">Roles</p>
              <p className="text-gray-900 dark:text-white">{user.roles?.map((r: any) => r.name).join(', ') || '-'}</p>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck size={18} /> Roles attribues
              </h2>
              <button
                onClick={() => {
                  setSelectedRoleIds(user.roles?.map((r: any) => r.id) || []);
                  updateRoles.mutate();
                }}
                disabled={updateRoles.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {updateRoles.isPending ? 'Enregistrement...' : 'Enregistrer les roles'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allRoles.map((role: any) => {
                const checked = selectedRoleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
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
                        if (e.target.checked) {
                          setSelectedRoleIds([...selectedRoleIds, role.id]);
                        } else {
                          setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.id));
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium">{role.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lock size={18} /> Securite
            </h2>
            {showResetPwd ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPwdError(''); }}
                    placeholder="Nouveau mot de passe"
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(''); }}
                    placeholder="Confirmer le mot de passe"
                    className="flex-1 px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                  />
                </div>
                {pwdError && <p className="text-sm text-red-500">{pwdError}</p>}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => resetPassword.mutate()}
                    disabled={resetPassword.isPending || !newPassword || !confirmPassword}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {resetPassword.isPending ? 'Modification...' : 'Modifier'}
                  </button>
                  <button
                    onClick={() => { setShowResetPwd(false); setNewPassword(''); setConfirmPassword(''); setPwdError(''); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetPwd(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Lock size={14} /> Reinitialiser le mot de passe
              </button>
            )}
          </div>
        </>
      )}

      {currentUser?.effectivePermissions?.['permissions.read'] && (
        <UserPermissionsPanel userId={parseInt(id as string)} />
      )}
    </PageWrapper>
  );
}
