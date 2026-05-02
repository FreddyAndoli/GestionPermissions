'use client';

interface Props {
  title: string;
  total: number;
  used: number;
  pending: number;
  color?: string;
}

export default function LeaveBalanceCard({ title, total, used, pending, color = '#22C55E' }: Props) {
  const remaining = total - used - pending;
  const pct = total > 0 ? ((used + pending) / total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border dark:border-slate-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400">{title}</h3>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{remaining}</span>
        <span className="text-sm text-gray-500 mb-1">/ {total} restants</span>
      </div>
      <div className="mt-3 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span>{used} utilises</span>
        <span>{pending} en attente</span>
      </div>
    </div>
  );
}
