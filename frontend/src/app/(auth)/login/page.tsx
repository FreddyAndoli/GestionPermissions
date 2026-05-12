'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Code2 } from 'lucide-react';
import apiClient from '@/lib/apiClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasFirebaseConfig = mounted ? !!auth : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (devMode || !hasFirebaseConfig) {
        const { data } = await apiClient.post('/auth/dev-login', { email }, {
          headers: { 'x-dev-mode': 'true' }
        });
        localStorage.setItem('devUserEmail', data.user.email);
        localStorage.setItem('devToken', data.token);
        localStorage.setItem('devUser', JSON.stringify(data.user));
        router.push('/dashboard');
        return;
      }

      if (!auth) return;
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      await apiClient.post('/auth/sync', {
        firebaseUid: cred.user.uid,
        email,
        firstName: cred.user.displayName?.split(' ')[0] || 'User',
        lastName: cred.user.displayName?.split(' ')[1] || ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8"
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Permission Manager</h1>

      {hasFirebaseConfig && (
        <div className="mb-4 flex items-center justify-center">
          <button
            type="button"
            onClick={() => { setDevMode(!devMode); setError(''); }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              devMode
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Code2 size={12} /> {devMode ? 'Mode developpement active' : 'Activer le mode developpement'}
          </button>
        </div>
      )}

      {devMode && (
        <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          Mode developpement active. Connexion sans Firebase.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            required
          />
        </div>
        {!devMode && (
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              required={!devMode}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
      <div className="mt-4 text-center space-y-2">
        <a href="/forgot-password" className="text-sm text-indigo-600 hover:underline block">Mot de passe oublie ?</a>
        <a href="/privacy-policy" className="text-sm text-gray-500 hover:underline block">Politique de confidentialite</a>
      </div>
    </motion.div>
  );
}
