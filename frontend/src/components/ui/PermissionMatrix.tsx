'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface Permission {
  id: number;
  slug: string;
  name: string;
  moduleId: number;
}

interface Props {
  permissions: Permission[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function PermissionMatrix({ permissions, selectedIds, onChange }: Props) {
  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const grouped = permissions.reduce((acc, p) => {
    const key = p.moduleId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<number, Permission[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([moduleId, perms]) => (
        <div key={moduleId} className="bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {perms.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                    checked
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                    checked ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-600 border'
                  }`}>
                    {checked && 'v'}
                  </span>
                  {p.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
