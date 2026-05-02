'use client';

import { useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { useAuth } from './useAuth';

export type Density = 'compact' | 'normal' | 'spacious';

export function useDensity() {
  const { isAuthenticated } = useAuth();
  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('density') as Density | null;
      return stored || 'normal';
    }
    return 'normal';
  });

  const setDensity = useCallback((value: Density) => {
    setDensityState(value);
    localStorage.setItem('density', value);
    if (isAuthenticated) {
      apiClient.put('/preferences', { density: value }).catch(() => {
        // ignore offline errors
      });
    }
  }, [isAuthenticated]);

  const rowHeight = density === 'compact' ? 'h-9' : density === 'spacious' ? 'h-16' : 'h-13';
  const padding = density === 'compact' ? 'p-2' : density === 'spacious' ? 'p-5' : 'p-4';
  const gap = density === 'compact' ? 'gap-2' : density === 'spacious' ? 'gap-5' : 'gap-4';

  return { density, setDensity, rowHeight, padding, gap };
}
