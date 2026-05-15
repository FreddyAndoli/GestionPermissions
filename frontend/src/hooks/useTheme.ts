'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { useAuth } from './useAuth';

export function useTheme() {
  const { isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (stored) setThemeState(stored);
  }, []);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const setTheme = useCallback((value: 'light' | 'dark' | 'system') => {
    setThemeState(value);
    localStorage.setItem('theme', value);
    if (isAuthenticated) {
      apiClient.put('/preferences', { theme: value }).catch(() => {
        // ignore offline errors
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    setResolvedTheme(resolved);
    if (resolved === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        const resolved = mq.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        const root = document.documentElement;
        if (resolved === 'dark') root.classList.add('dark');
        else root.classList.remove('dark');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}
