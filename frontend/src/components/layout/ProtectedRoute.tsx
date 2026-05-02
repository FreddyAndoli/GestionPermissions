'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  children: React.ReactNode;
  requiredPermission?: string;
}

export default function ProtectedRoute({ children, requiredPermission }: Props) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (requiredPermission && !hasPermission(requiredPermission) && !isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Acces refuse
      </div>
    );
  }

  return <>{children}</>;
}
