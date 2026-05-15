'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Megaphone, X, Mail, Send, Bell } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import Modal from '@/components/ui/Modal';
import { usePermissions } from '@/hooks/usePermissions';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const LEVEL_OPTIONS = [
  { value: 'info', label: 'Information', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'warning', label: 'Avertissement', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'critical', label: 'Critique', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
];

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { isAdmin, hasPermission } = usePermissions();
  const canCreate = isAdmin() || hasPermission('admin.read');

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState('info');
  const [isDismissible, setIsDismissible] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [targetRoles, setTargetRoles] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await apiClient.get('/announcements');
      return data as any[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/announcements', {
        title,
        message,
        level,
        isDismissible,
        sendEmail,
        targetRoles: targetRoles ? targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setModalOpen(false);
      resetForm();
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch(`/announcements/${id}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setLevel('info');
    setIsDismissible(true);
    setSendEmail(false);
    setTargetRoles('');
  };

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Annonces</h1>
        {canCreate && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {(data || []).map((a: any) => {
              const levelOpt = LEVEL_OPTIONS.find((l) => l.value === a.level) || LEVEL_OPTIONS[0];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 border dark:border-slate-700 relative"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${levelOpt.color}`}>
                          <Megaphone size={12} /> {levelOpt.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 whitespace-pre-line">{a.message}</p>
                    </div>
                    {a.isDismissible && (
                      <button
                        onClick={() => dismissMutation.mutate(a.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                        title="Masquer"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {(data || []).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Bell size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Aucune annonce active</p>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle annonce">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Niveau</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Roles cibles (optionnel)</label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="Super Admin, Manager..."
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isDismissible}
                onChange={(e) => setIsDismissible(e.target.checked)}
                className="rounded border-gray-300"
              />
              Masquable par les utilisateurs
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Mail size={14} /> Envoyer par email
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Annuler
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !title}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={14} />
              {createMutation.isPending ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
