'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PageWrapper from '@/components/layout/PageWrapper';
import apiClient from '@/lib/apiClient';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  User, Mail, Building2, ShieldCheck, Briefcase, Calendar, Edit3, Save, X,
  ArrowLeft, Camera, Hash, Download
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const { data: userDetails } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${user?.id}`);
      return data;
    },
    enabled: !!user && !authLoading
  });

  const { data: leaveStats } = useQuery({
    queryKey: ['leave-stats', user?.id],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get(`/leaves?userId=${user?.id}&limit=1`);
        return data;
      } catch (err: any) {
        console.error('Leave stats error', err);
        return null;
      }
    },
    enabled: !!user && !authLoading
  });

  useEffect(() => {
    if (userDetails) {
      setFirstName(userDetails.firstName || '');
      setLastName(userDetails.lastName || '');
      setAvatarUrl(userDetails.avatarUrl || '');
      setPhoneNumber(userDetails.phoneNumber || '');
    }
  }, [userDetails]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      await apiClient.put(`/users/${user?.id}`, {
        firstName,
        lastName,
        avatarUrl: avatarUrl || undefined,
        phoneNumber: phoneNumber || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      setEditMode(false);
    }
  });

  if (authLoading || !user) {
    return (
      <PageWrapper>
        <div className="p-6 text-sm text-gray-500">Chargement...</div>
      </PageWrapper>
    );
  }

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </button>
          <button
            onClick={() => {
              if (!editMode) {
                setFirstName(userDetails?.firstName || user.firstName || '');
                setLastName(userDetails?.lastName || user.lastName || '');
                setAvatarUrl(userDetails?.avatarUrl || user.avatarUrl || '');
                setPhoneNumber(userDetails?.phoneNumber || '');
              }
              setEditMode(!editMode);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {editMode ? <X size={14} /> : <Edit3 size={14} />}
            {editMode ? 'Annuler' : 'Modifier'}
          </button>
        </div>

        {/* Carte profil */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              <div className="w-32 h-32 rounded-xl border-4 border-white dark:border-slate-800 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-3xl font-bold text-indigo-600 dark:text-indigo-400 overflow-hidden shadow-lg">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  initials
                )}
              </div>
              {editMode && (
                <div className="absolute bottom-2 left-24">
                  <div className="p-1.5 bg-white dark:bg-slate-700 rounded-full shadow border dark:border-slate-600">
                    <Camera size={14} className="text-gray-600 dark:text-slate-300" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={user.status} />
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
                  ID {user.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={18} /> Informations personnelles
            </h2>
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    value={user.email}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-sm text-gray-500 dark:text-slate-400 outline-none cursor-not-allowed"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Avatar URL</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => updateProfile.mutate()}
                    disabled={updateProfile.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save size={14} /> {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <Mail size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Email</p>
                    <p className="text-sm text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <Hash size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Telephone</p>
                    <p className="text-sm text-gray-900 dark:text-white">{userDetails?.phoneNumber || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <Building2 size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Departement</p>
                    <p className="text-sm text-gray-900 dark:text-white">{userDetails?.department?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                  <Briefcase size={16} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Organisation</p>
                    <p className="text-sm text-gray-900 dark:text-white">{userDetails?.organizationId || user.organizationId}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Roles & Permissions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={18} /> Roles et permissions
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Roles attribues</p>
                <div className="flex flex-wrap gap-2">
                  {userDetails?.roles?.length ? (
                    userDetails.roles.map((r: any) => (
                      <span
                        key={r.id}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400"
                      >
                        {r.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">Aucun role</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Permissions effectives</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {user.effectivePermissions ? (
                    Object.entries(user.effectivePermissions)
                      .filter(([, granted]) => granted)
                      .slice(0, 20)
                      .map(([key]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-xs"
                        >
                          <span className="text-green-800 dark:text-green-300">{key}</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">Accorde</span>
                        </div>
                      ))
                  ) : (
                    <span className="text-sm text-gray-400">Aucune permission</span>
                  )}
                </div>
                {user.effectivePermissions && Object.values(user.effectivePermissions).filter(Boolean).length > 20 && (
                  <p className="text-xs text-gray-400 mt-1">
                    + {Object.values(user.effectivePermissions).filter(Boolean).length - 20} autres permissions...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions rapides</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Parametres
            </button>
            <button
              onClick={() => router.push('/leaves')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Calendar size={14} /> Mes conges
            </button>
            <button
              onClick={async () => {
                try {
                  const { data } = await apiClient.get(`/users/${user?.id}/export-data`);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mes-donnees-${user?.id}.json`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Export error', err);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              <Download size={14} /> Télécharger mes données
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
