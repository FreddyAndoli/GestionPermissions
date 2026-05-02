'use client';

import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (slug: string): boolean => {
    if (!user) return false;
    if (user.effectivePermissions?.['admin.read']) return true;
    return user.effectivePermissions?.[slug] === true;
  };

  const isAdmin = (): boolean => {
    return !!user?.effectivePermissions?.['admin.read'];
  };

  return { hasPermission, isAdmin, permissions: user?.effectivePermissions || {} };
}
