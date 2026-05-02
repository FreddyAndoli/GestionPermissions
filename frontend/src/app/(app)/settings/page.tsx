'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useDensity } from '@/hooks/useDensity';
import PageWrapper from '@/components/layout/PageWrapper';
import apiClient from '@/lib/apiClient';
import { auth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import { Save, Sun, Moon, Monitor, Smartphone, Mail, MessageCircle, User, Lock, Eye, EyeOff, Hash, Link, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [language, setLanguage] = useState('fr');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifTelegram, setNotifTelegram] = useState(false);

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [botInfo, setBotInfo] = useState<any>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiClient.get('/preferences')
      .then(({ data }) => { if (!cancelled) { setPreferences(data); setPrefsLoaded(true); } })
      .catch(() => { if (!cancelled) setPrefsLoaded(true); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    apiClient.get('/telegram/bot-info')
      .then(({ data }) => { if (!cancelled) setBotInfo(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (preferences) {
      if (preferences.language) setLanguage(preferences.language);
      if (preferences.telegramChatId) setTelegramChatId(preferences.telegramChatId);
      if (preferences.notificationChannels) {
        setNotifPush(!!preferences.notificationChannels.push);
        setNotifEmail(!!preferences.notificationChannels.email);
        setNotifTelegram(!!preferences.notificationChannels.telegram);
      }
    }
  }, [preferences]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated || !user) throw new Error('Non authentifie');
      await apiClient.put(`/users/${user.id}`, { firstName, lastName, avatarUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    }
  });

  const updatePrefs = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) throw new Error('Non authentifie');
      await apiClient.put('/preferences', {
        theme,
        density,
        language,
        telegramChatId: telegramChatId || undefined,
        notificationChannels: { push: notifPush, email: notifEmail, telegram: notifTelegram }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    }
  });

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('Tous les champs sont obligatoires');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('Le nouveau mot de passe doit contenir au moins 6 caracteres');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }
    if (!auth?.currentUser) {
      setPwdError('Utilisateur non authentifie');
      return;
    }
    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPwd);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPwd);
      setPwdSuccess('Mot de passe mis a jour avec succes');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdModalOpen(false), 1500);
    } catch (err: any) {
      setPwdError(err.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setPwdLoading(false);
    }
  };

  if (authLoading || !user) return <div className="p-6">Chargement...</div>;

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Parametres</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profil */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User size={18} /> Profil
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Prenom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-sm text-gray-500 dark:text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Hash size={14} /> ID Utilisateur
                </label>
                <input
                  type="text"
                  value={user?.id || ''}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-sm text-gray-500 dark:text-slate-400 outline-none cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Avatar URL</label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              />
            </div>
            <button
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={14} /> Enregistrer
            </button>
          </div>
        </div>

        {/* Apparence */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Sun size={18} /> Apparence
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Theme</label>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: 'Clair', icon: Sun },
                  { value: 'dark', label: 'Sombre', icon: Moon },
                  { value: 'system', label: 'Systeme', icon: Monitor }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      theme === t.value
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <t.icon size={14} /> {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Densite</label>
              <div className="flex gap-2">
                {[
                  { value: 'compact', label: 'Compact' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'spacious', label: 'Aere' }
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDensity(d.value as any)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      density === d.value
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                        : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Langue */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Langue</h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
          >
            <option value="fr">Francais</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail size={18} /> Notifications
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-white">Push navigateur</span>
              </div>
              <button
                onClick={() => setNotifPush(!notifPush)}
                className={`relative w-10 h-6 rounded-full transition-colors ${notifPush ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifPush ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-white">Email</span>
              </div>
              <button
                onClick={() => setNotifEmail(!notifEmail)}
                className={`relative w-10 h-6 rounded-full transition-colors ${notifEmail ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifEmail ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-gray-500" />
                <span className="text-sm text-gray-900 dark:text-white">Telegram</span>
              </div>
              <button
                onClick={() => setNotifTelegram(!notifTelegram)}
                className={`relative w-10 h-6 rounded-full transition-colors ${notifTelegram ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-600'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifTelegram ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>

            {/* Section Telegram detaillee */}
            {notifTelegram && (
              <div className="mt-3 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">
                    Liaison avec Telegram
                  </h3>
                </div>

                {/* Statut */}
                <div className="flex items-center gap-2">
                  {telegramChatId ? (
                    <>
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Compte lie (chat ID : {telegramChatId})
                      </span>
                    </>
                  ) : (
                    <>
                      <Link size={16} className="text-amber-600" />
                      <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                        Compte non lie — suivez les etapes ci-dessous
                      </span>
                    </>
                  )}
                </div>

                {/* Etapes */}
                <ol className="space-y-2 text-sm text-gray-700 dark:text-slate-300 list-decimal list-inside">
                  <li>
                    <strong>Activez les notifications Telegram</strong> ci-dessus (toggle ON).
                  </li>
                  <li>
                    {botInfo?.username ? (
                      <>
                        <strong>Ouvrez Telegram</strong> et cherchez le bot <strong>@{botInfo.username}</strong>,
                        ou scannez le QR code ci-dessous.
                      </>
                    ) : (
                      <strong>Le bot Telegram n'est pas configure.</strong>
                    )}
                  </li>
                  <li>
                    <strong>Envoyez la commande</strong> <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded text-xs">/start {user?.id}</code> au bot.
                  </li>
                  <li>
                    Le bot repondra et votre compte sera automatiquement lie. Vous recevrez desormais vos notifications ici.
                  </li>
                </ol>

                {/* QR Code */}
                {botInfo?.username && user?.id && !telegramChatId && (
                  <div className="flex flex-col items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-600">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">QR code de liaison</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
                      Scannez avec votre telephone pour ouvrir Telegram.
                    </p>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <QRCodeSVG
                        value={`https://t.me/${botInfo.username}?start=${user.id}`}
                        size={160}
                        level="M"
                      />
                    </div>
                    <a
                      href={`https://t.me/${botInfo.username}?start=${user.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Ou cliquez ici si vous etes deja sur mobile
                    </a>
                  </div>
                )}

                {/* Champ Chat ID avance */}
                <div className="border-t border-indigo-100 dark:border-indigo-900/30 pt-3">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Parametres avances (Chat ID manuel)
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Le <strong>Chat ID</strong> est l'identifiant unique de votre conversation avec le bot.
                        Normalement il se remplit automatiquement quand vous envoyez <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded">/start</code>.
                        Ne modifiez ce champ que si vous savez ce que vous faites.
                      </p>
                      <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="Ex: 123456789"
                        className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => updatePrefs.mutate()}
            disabled={updatePrefs.isPending}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={14} /> Enregistrer les preferences
          </button>
        </div>

        {/* Securite */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border dark:border-slate-700 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock size={18} /> Securite
          </h2>
          <button
            onClick={() => {
              setPwdModalOpen(true);
              setPwdError('');
              setPwdSuccess('');
              setCurrentPwd('');
              setNewPwd('');
              setConfirmPwd('');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Lock size={14} /> Changer le mot de passe
          </button>
        </div>
      </div>

      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md border dark:border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Changer le mot de passe</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mot de passe actuel</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nouveau mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Confirmer le mot de passe</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                />
              </div>
              {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
              {pwdSuccess && <p className="text-sm text-green-600">{pwdSuccess}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPwdModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={pwdLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {pwdLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
