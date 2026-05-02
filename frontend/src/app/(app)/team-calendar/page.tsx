'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import { usePermissions } from '@/hooks/usePermissions';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  isSameMonth, getDay
} from 'date-fns';

interface CalendarLeave {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  status: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  leaveTypeName?: string;
  leaveTypeColor?: string;
}

interface UserItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface BalanceItem {
  leaveType?: { name: string; color?: string };
  totalQuota: number;
  usedDays: number;
  pendingDays: number;
  carriedOverDays: number;
}

interface HolidayItem {
  id: number;
  name: string;
  holidayDate: string;
  countryCode: string;
}

export default function TeamCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const { hasPermission } = usePermissions();
  const canViewUsers = hasPermission('users.read');

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    enabled: canViewUsers,
    queryFn: async () => {
      const { data } = await apiClient.get('/users?limit=1000');
      return (data?.data || []) as UserItem[];
    }
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ['team-calendar', currentMonth.getMonth(), currentMonth.getFullYear(), selectedUserId],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: String(currentMonth.getMonth() + 1),
        year: String(currentMonth.getFullYear())
      });
      if (selectedUserId) params.append('userId', String(selectedUserId));
      const { data } = await apiClient.get(`/leaves/team-calendar?${params.toString()}`);
      return (data || []) as CalendarLeave[];
    }
  });

  const { data: balance = [] } = useQuery({
    queryKey: ['leave-balance', selectedUserId],
    enabled: !!selectedUserId && canViewUsers,
    queryFn: async () => {
      const { data } = await apiClient.get(`/leaves/balance?userId=${selectedUserId}`);
      return (data || []) as BalanceItem[];
    }
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['public-holidays', currentMonth.getFullYear()],
    queryFn: async () => {
      const { data } = await apiClient.get(`/public-holidays?country=TG&year=${currentMonth.getFullYear()}`);
      return (data || []) as HolidayItem[];
    }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startWeekday = getDay(monthStart);

  const holidayDates = new Map<string, HolidayItem>();
  holidays.forEach((h) => {
    const d = new Date(h.holidayDate).toISOString().split('T')[0];
    holidayDates.set(d, h);
  });

  const getLeavesForDay = (day: Date) => {
    const ds = day.toISOString().split('T')[0];
    return leaves.filter((l) => {
      const start = new Date(l.startDate).toISOString().split('T')[0];
      const end = new Date(l.endDate).toISOString().split('T')[0];
      return ds >= start && ds <= end;
    });
  };

  const isHoliday = (day: Date) => {
    const ds = day.toISOString().split('T')[0];
    return holidayDates.has(ds);
  };

  return (
    <PageWrapper>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier equipe</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Visualisez les conges approuves et les jours feries du Togo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canViewUsers && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tous les employes</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[8rem] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: undefined })}
            </span>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {selectedUserId && balance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Solde de conges restant</h3>
          <div className="flex flex-wrap gap-3">
            {balance.map((b) => {
              const remaining = (b.totalQuota || 0) + (b.carriedOverDays || 0) - (b.usedDays || 0) - (b.pendingDays || 0);
              return (
                <div
                  key={b.leaveType?.name}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-700/50"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: b.leaveType?.color || '#6366F1' }}
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-200">
                    {b.leaveType?.name}: <span className="font-semibold">{remaining}</span> jours
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => (
            <div key={d} className="bg-gray-50 dark:bg-slate-800 px-2 py-2 text-xs font-medium text-gray-500 dark:text-slate-400 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-slate-700">
          {Array.from({ length: startWeekday }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white dark:bg-slate-800 min-h-[6rem]" />
          ))}
          {days.map((day) => {
            const dayLeaves = getLeavesForDay(day);
            const holiday = isHoliday(day) ? holidayDates.get(day.toISOString().split('T')[0]) : null;
            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`bg-white dark:bg-slate-800 min-h-[6rem] p-2 ${holiday ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isSameMonth(day, currentMonth) ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <span title={holiday.name} className="text-[9px] text-red-600 dark:text-red-400 truncate max-w-[3rem]">
                      {holiday.name}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayLeaves.map((leave) => (
                    <div
                      key={`${leave.id}-${leave.startDate}`}
                      className="text-[10px] px-1.5 py-0.5 rounded text-white truncate"
                      style={{ backgroundColor: leave.leaveTypeColor || '#6366F1' }}
                      title={`${leave.firstName} ${leave.lastName} - ${leave.leaveTypeName || 'Conge'}\nDu ${format(new Date(leave.startDate), 'dd/MM/yyyy')} au ${format(new Date(leave.endDate), 'dd/MM/yyyy')}\n${leave.totalDays} jours`}
                    >
                      {leave.firstName} {leave.lastName}
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" />
          Jour ferie (Togo)
        </div>
        <div className="flex items-center gap-1">
          <CalendarDays size={14} />
          Survolez un conge pour voir les dates detaillees
        </div>
      </div>
    </PageWrapper>
  );
}
