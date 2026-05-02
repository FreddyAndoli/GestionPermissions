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

export function useAuth() {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev mode takes priority if explicitly enabled via localStorage
    const devEmail = localStorage.getItem('devUserEmail');
    if (devEmail) {
      apiClient.get('/auth/me')
        .then(({ data }) => setUser(data))
        .catch((err: any) => {
          if (err.response?.status === 401) {
            localStorage.removeItem('devUserEmail');
          }
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
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = useCallback(async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors
    }
    localStorage.removeItem('devUserEmail');
    localStorage.removeItem('theme');
    localStorage.removeItem('density');
    setUser(null);
    router.push('/login');
  }, [router]);

  return { firebaseUser, user, loading, isAuthenticated: !!user, logout };
}
