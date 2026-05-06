'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import apiClient from '@/lib/apiClient';

interface User {
  id: number;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  organizationId: number;
  departmentId?: number | null;
  status: string;
  effectivePermissions: Record<string, boolean>;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

export function useAuth() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = useCallback(async (orgId: number) => {
    try {
      const { data } = await apiClient.get('/organizations/me');
      setOrganization(data);
    } catch (err: any) {
      console.error('Fetch organization error', err);
      setOrganization(null);
    }
  }, []);

  useEffect(() => {
    const devEmail =
      process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL ||
      (typeof window !== 'undefined' ? localStorage.getItem('devUserEmail') : null);
    const devToken = typeof window !== 'undefined' ? localStorage.getItem('devToken') : null;

    if (devEmail && devToken && !auth) {
      apiClient
        .get('/auth/me')
        .then(({ data }) => {
          setUser(data);
          if (data?.organizationId) {
            fetchOrganization(data.organizationId);
          }
        })
        .catch((err: any) => {
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    if (!auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const { data } = await apiClient.get('/auth/me');
          setUser(data);
          if (data?.organizationId) {
            fetchOrganization(data.organizationId);
          }
        } catch (err: any) {
          console.error('Auth me error', err);
          setUser(null);
        }
      } else {
        setUser(null);
        setOrganization(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchOrganization]);

  const logout = useCallback(async () => {
    try {
      if (auth) {
        await signOut(auth);
      } else {
        await apiClient.post('/auth/logout');
      }
    } catch (err: any) {
      console.error('Sign out error', err);
    }
    localStorage.removeItem('theme');
    localStorage.removeItem('density');
    localStorage.removeItem('devUserEmail');
    localStorage.removeItem('devToken');
    setUser(null);
    setOrganization(null);
    router.push('/login');
  }, [router]);

  return { firebaseUser, user, organization, loading, isAuthenticated: !!user, logout };
}
