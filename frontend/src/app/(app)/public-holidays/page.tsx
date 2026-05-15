'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Trash2, Edit, Info } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { usePermissions } from '@/hooks/usePermissions';
import PageWrapper from '@/components/layout/PageWrapper';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PublicHoliday {
  id: number;
  name: string;
  holidayDate: string;
  countryCode: string;
  isCustom: boolean;
}

export default function PublicHolidaysPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('admin.write');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PublicHoliday | null>(null);
  const [name, setName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [countryCode, setCountryCode] = useState('FR');

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['public-holidays'],
    queryFn: async () => {
      const { data } = await apiClient.get('/public-holidays');
      return data as PublicHoliday[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/public-holidays', { name, holidayDate, countryCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      await apiClient.put(`/public-holidays/${editing.id}`, { name, holidayDate, countryCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/public-holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-holidays'] });
    }
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setName('');
    setHolidayDate('');
    setCountryCode('FR');
  };

  const openEdit = (h: PublicHoliday) => {
    setEditing(h);
    setName(h.name);
    setHolidayDate(format(new Date(h.holidayDate), 'yyyy-MM-dd'));
    setCountryCode(h.countryCode);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const currentYear = new Date().getFullYear();
  const thisYearHolidays = holidays.filter((h) => new Date(h.holidayDate).getFullYear() === currentYear);
  const nextYearHolidays = holidays.filter((h) => new Date(h.holidayDate).getFullYear() === currentYear + 1);

  const columns = [
    { key: 'name', label: 'Nom' },
    {
      key: 'holidayDate',
      label: 'Date',
      render: (row: PublicHoliday) => format(new Date(row.holidayDate), 'dd MMMM yyyy', { locale: fr })
    },
    { key: 'countryCode', label: 'Pays' },
    {
      key: 'isCustom',
      label: 'Type',
      render: (row: PublicHoliday) => (
        <span className={`text-xs px-2 py-1 rounded-full ${row.isCustom ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
          {row.isCustom ? 'Personnalise' : 'Systeme'}
        </span>
      )
    },
    ...(canWrite
      ? [
          {
            key: 'actions',
            label: 'Actions',
            render: (row: PublicHoliday) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(row);
                  }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Supprimer ce jour ferie ?')) deleteMutation.mutate(row.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <PageWrapper>
      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">A quoi servent les jours feres ?</p>
          <p className="mt-1">
            Ce sont les jours non ouvrables pour votre pays. Ils ne sont pas comptes comme des jours de conge dans vos demandes. Les jours systeme sont charges automatiquement ; les jours personnalises peuvent etre ajoutes par un administrateur.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jours feres</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {thisYearHolidays.length} jours feres pour {currentYear} · {nextYearHolidays.length} pour {currentYear + 1}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Ajouter
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden shadow-sm">
        <DataTable columns={columns} data={holidays.sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime())} />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Modifier' : 'Ajouter un jour ferie'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              placeholder="Ex: Fete Nationale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Date</label>
            <input
              type="date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pays</label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
            >
              <option value="FR">France</option>
              <option value="TG">Togo</option>
              <option value="CI">Cote d'Ivoire</option>
              <option value="SN">Senegal</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="CA">Canada</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name || !holidayDate || createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
