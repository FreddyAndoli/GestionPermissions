'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDevMode = !auth;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDevMode) {
      setSent(true);
      return;
    }
    setLoading(true);
    try {
      if (!auth) return;
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      // ignore
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Reinitialisation</h1>
      {sent ? (
        <p className="text-green-600 text-center">Un email de reinitialisation a ete envoye.</p>
      ) : (
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
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      )}
      <div className="mt-4 text-center">
        <a href="/login" className="text-sm text-indigo-600 hover:underline">Retour a la connexion</a>
      </div>
    </motion.div>
  );
}
