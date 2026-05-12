'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useWebSocket, AnnouncementMessage } from '@/hooks/useWebSocket';

interface Toast {
  id: number;
  title: string;
  message: string;
  level: string;
}

export default function AnnouncementToast() {
  const { lastMessage } = useWebSocket();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (lastMessage?.type === 'announcement') {
      const msg = lastMessage as AnnouncementMessage;
      setToasts((prev) => {
        if (prev.some((t) => t.id === msg.data.id)) return prev;
        return [...prev, { id: msg.data.id, title: msg.data.title, message: msg.data.message, level: msg.data.level }];
      });
    }
  }, [lastMessage]);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const iconMap = {
    info: Info,
    warning: AlertTriangle,
    critical: AlertCircle
  };

  const colorMap = {
    info: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200',
    warning: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
    critical: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
  };

  return (
    <div className="fixed top-20 right-6 z-[60] flex flex-col gap-3 w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = iconMap[toast.level as keyof typeof iconMap] || Megaphone;
          const colors = colorMap[toast.level as keyof typeof colorMap] || colorMap.info;
          return (
            <motion.div
              key={toast.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`rounded-xl border-l-4 shadow-lg p-4 pr-8 ${colors}`}
            >
              <div className="flex items-start gap-3">
                <Icon size={20} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{toast.title}</p>
                  <p className="text-xs mt-1 opacity-90 whitespace-pre-line">{toast.message}</p>
                </div>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="absolute top-3 right-3 opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
