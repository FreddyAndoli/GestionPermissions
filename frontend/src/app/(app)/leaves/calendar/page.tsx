'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths,
  getDay
} from 'date-fns';

interface LeaveItem {
  id: number;
  status: string;
  totalDays: number;
  reason?: string;
  periods: { startDate: string; endDate: string }[];
  leaveType?: { name: string; color?: string };
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

export default function PersonalCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: leaves = [] } = useQuery({
    queryKey: ['my-leaves', currentMonth.getMonth(), currentMonth.getFullYear()],
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves');
      return data as LeaveItem[];
    }
  });

  const { data: balance = [] } = useQuery({
    queryKey: ['my-balance'],
    queryFn: async () => {
      const { data } = await apiClient.get('/leaves/balance');
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
    return leaves.filter((l) => {
      if (!l.periods) return false;
      return l.periods.some((p) => {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        return day >= start && day <= end;
      });
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mon calendrier de conges</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Visualisez vos conges et les jours feries du Togo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[8rem] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {balance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Mon solde de conges restant</h3>
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
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{format(day, 'd')}</span>
                  {holiday && (
                    <span title={holiday.name} className="text-[9px] text-red-600 dark:text-red-400 truncate max-w-[3rem]">
                      {holiday.name}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayLeaves.map((leave) => {
                    const period = leave.periods?.[0];
                    return (
                      <div
                        key={leave.id}
                        className="text-[10px] px-1.5 py-0.5 rounded text-white truncate"
                        style={{ backgroundColor: leave.leaveType?.color || '#6366F1' }}
                        title={`${leave.leaveType?.name || 'Conge'} - ${leave.status}\nDu ${period ? format(new Date(period.startDate), 'dd/MM/yyyy') : ''} au ${period ? format(new Date(period.endDate), 'dd/MM/yyyy') : ''}\n${leave.totalDays} jours${leave.reason ? '\nMotif: ' + leave.reason : ''}`}
                      >
                        {leave.leaveType?.name || 'Conge'}
                      </div>
                    );
                  })}
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
