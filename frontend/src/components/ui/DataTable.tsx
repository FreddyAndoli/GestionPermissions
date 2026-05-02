'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDensity } from '@/hooks/useDensity';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface Props {
  columns: Column[];
  data: any[];
  pagination?: { page: number; totalPages: number };
  onPageChange?: (page: number) => void;
  onRowClick?: (row: any) => void;
}

export default function DataTable({ columns, data, pagination, onPageChange, onRowClick }: Props) {
  const { rowHeight, padding } = useDensity();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`text-left font-medium text-gray-500 dark:text-slate-400 ${padding}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <motion.tr
                key={row.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onRowClick?.(row)}
                className={`border-t dark:border-slate-700 ${rowHeight} ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`text-gray-900 dark:text-slate-100 ${padding}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t dark:border-slate-700">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-gray-500">Page {pagination.page}</span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
