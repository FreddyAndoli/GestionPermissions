'use client';

import { useDensity } from '@/hooks/useDensity';
import { PanelLeftClose, PanelLeftOpen, PanelLeft } from 'lucide-react';

export default function DensityToggle() {
  const { density, setDensity } = useDensity();

  const cycle = () => {
    if (density === 'normal') setDensity('compact');
    else if (density === 'compact') setDensity('spacious');
    else setDensity('normal');
  };

  return (
    <button onClick={cycle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
      {density === 'compact' ? <PanelLeftClose size={18} />
      : density === 'spacious' ? <PanelLeftOpen size={18} />
      : <PanelLeft size={18} />}
    </button>
  );
}
