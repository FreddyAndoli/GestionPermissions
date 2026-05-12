'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Settings2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CookieConsent {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'pm_cookie_consent';

function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeConsent(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
    } else {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    const c: CookieConsent = { essential: true, analytics: true, functional: true, timestamp: new Date().toISOString() };
    storeConsent(c);
    setConsent(c);
    setShowBanner(false);
  };

  const rejectNonEssential = () => {
    const c: CookieConsent = { essential: true, analytics: false, functional: false, timestamp: new Date().toISOString() };
    storeConsent(c);
    setConsent(c);
    setShowBanner(false);
  };

  const customize = (analytics: boolean, functional: boolean) => {
    const c: CookieConsent = { essential: true, analytics, functional, timestamp: new Date().toISOString() };
    storeConsent(c);
    setConsent(c);
    setShowBanner(false);
  };

  return { consent, showBanner, acceptAll, rejectNonEssential, customize };
}

export default function CookieBanner() {
  const { consent, showBanner, acceptAll, rejectNonEssential, customize } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(true);

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-t dark:border-slate-700 shadow-lg p-4 md:p-6"
        >
          <div className="max-w-5xl mx-auto">
            {!showCustomize ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Cookie size={24} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      Ce site utilise des cookies
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Nous utilisons des cookies essentiels pour le fonctionnement du service, ainsi que des cookies fonctionnels et analytiques avec votre consentement.
                      {' '}
                      <a href="/privacy-policy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                        En savoir plus
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowCustomize(true)}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Personnaliser
                  </button>
                  <button
                    onClick={rejectNonEssential}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Refuser
                  </button>
                  <button
                    onClick={acceptAll}
                    className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Tout accepter
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings2 size={16} /> Personnaliser les cookies
                  </h3>
                  <button onClick={() => setShowCustomize(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Essentiels</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Nécessaires au fonctionnement du site (authentification, sécurité).</p>
                    </div>
                    <span className="text-xs font-medium text-gray-400">Obligatoire</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Fonctionnels</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Préférences (thème, langue, densité).</p>
                    </div>
                    <button
                      onClick={() => setFunctional(!functional)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${functional ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${functional ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Analytiques</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Statistiques d'utilisation anonymisées.</p>
                    </div>
                    <button
                      onClick={() => setAnalytics(!analytics)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${analytics ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${analytics ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCustomize(false)}
                    className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => customize(analytics, functional)}
                    className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Check size={14} /> Enregistrer
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
