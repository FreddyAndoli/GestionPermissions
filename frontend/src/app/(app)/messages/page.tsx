'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import PageWrapper from '@/components/layout/PageWrapper';
import { Send, MessageCircle } from 'lucide-react';

interface Conversation {
  id: number;
  title?: string;
  participants: { id: number; firstName: string; lastName: string; email: string }[];
  lastMessage?: { content: string; createdAt: string };
}

interface MessageItem {
  id: number;
  senderId: number;
  content: string;
  createdAt: string;
}

export default function MessagesPage() {
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/conversations');
      return data as Conversation[];
    },
    refetchInterval: 10000
  });

  const { data: convDetail } = useQuery({
    queryKey: ['conversation', selectedConv],
    queryFn: async () => {
      if (!selectedConv) return null;
      const { data } = await apiClient.get(`/conversations/${selectedConv}`);
      return data as { conversation: Conversation; messages: MessageItem[]; participants: Conversation['participants'] };
    },
    refetchInterval: 5000,
    enabled: !!selectedConv
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedConv || !message.trim()) return;
      await apiClient.post(`/conversations/${selectedConv}/messages`, { content: message });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Messagerie</h1>
      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden flex h-[32rem]">
        <div className="w-64 border-r dark:border-slate-700 flex flex-col">
          <div className="p-3 border-b dark:border-slate-700 font-medium text-sm text-gray-900 dark:text-white">Conversations</div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="text-sm text-gray-500 p-4">Aucune conversation.</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConv(c.id)}
                className={`w-full text-left px-4 py-3 border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                  selectedConv === c.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {c.title || c.participants.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                </p>
                {c.lastMessage && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{c.lastMessage.content}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedConv && convDetail ? (
            <>
              <div className="p-3 border-b dark:border-slate-700 font-medium text-sm text-gray-900 dark:text-white">
                {convDetail.conversation.title || convDetail.participants.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {convDetail.messages.map((m) => (
                  <div key={m.id} className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">
                      {convDetail.participants.find((p) => p.id === m.senderId)?.firstName || 'Moi'}
                    </span>
                    <div className="bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg text-sm text-gray-900 dark:text-white inline-block self-start">
                      {m.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t dark:border-slate-700 flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage.mutate()}
                  placeholder="Ecrire un message..."
                  className="flex-1 px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => sendMessage.mutate()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-slate-400">
              <div className="text-center">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selectionnez une conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
