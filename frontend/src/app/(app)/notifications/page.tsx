'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCheck, Filter, Bell, Info } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: number;
  title: string;
  message?: string;
  type: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canRead = hasPermission('notifications.read');

  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    enabled: canRead,
    queryFn: async () => {
      const { data } = await apiClient.get('/notifications');
      return data as Notification[];
    },
    refetchInterval: 30000
  });

  const markAsRead = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.post(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const filtered = notifications.filter((n) => {
    if (filter === 'read') return n.isRead;
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const columns = [
    {
      key: 'status',
      label: '',
      render: (row: Notification) => (
        <div className="flex items-center justify-center">
          {!row.isRead ? (
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
          ) : (
            <span className="w-2.5 h-2.5 bg-gray-200 dark:bg-slate-600 rounded-full" />
          )}
        </div>
      )
    },
    { key: 'title', label: 'Titre' },
    {
      key: 'message',
      label: 'Message',
      render: (row: Notification) => (
        <span className="text-gray-500 dark:text-slate-400 truncate max-w-xs block">
          {row.message || '-'}
        </span>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: Notification) => {
        const colors: Record<string, string> = {
          announcement: 'bg-blue-100 text-blue-700',
          leave: 'bg-green-100 text-green-700',
          security: 'bg-red-100 text-red-700',
          system: 'bg-gray-100 text-gray-700'
        };
        return (
          <span className={`text-xs px-2 py-1 rounded-full ${colors[row.type] || colors.system}`}>
            {row.type}
          </span>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (row: Notification) =>
        format(new Date(row.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Notification) => (
        !row.isRead ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markAsRead.mutate(row.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg transition-colors"
          >
            <Check size={14} /> Marquer lu
          </button>
        ) : (
          <span className="text-xs text-gray-400">Lu</span>
        )
      )
    }
  ];

  return (
    <PageWrapper>
      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Centre de notifications</p>
          <p className="mt-1">
            Retrouvez ici les alertes concernant vos demandes de conge (approbations, refus), les annonces de l'entreprise, et les alertes de securite. Marquez-les comme lues une fois consultees pour garder votre espace organise.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Bell size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est a jour'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg transition-colors"
            >
              <CheckCheck size={16} /> Tout marquer lu
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Lues'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={filtered} />
      </div>
    </PageWrapper>
  );
}
