'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw, Frown } from 'lucide-react';

interface ErrorPageProps {
  title: string;
  message: string;
  statusCode?: number;
  reset?: () => void;
  showHome?: boolean;
}

export default function ErrorPage({ title, message, statusCode, reset, showHome = true }: ErrorPageProps) {
  const Icon = statusCode === 404 ? Frown : AlertTriangle;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <Icon size={32} className="text-red-500 dark:text-red-400" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Permission Manager
        </h1>

        {statusCode && (
          <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
            {statusCode}
          </p>
        )}

        <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2">
          {title}
        </h2>

        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
          {message}
        </p>

        <div className="flex items-center justify-center gap-3">
          {reset && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} /> Réessayer
            </button>
          )}
          {showHome && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border dark:border-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
            >
              <Home size={16} /> Tableau de bord
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
