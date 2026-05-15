'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageCircle, Plus, Search, X, Users, Info } from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import PageWrapper from '@/components/layout/PageWrapper';
import Modal from '@/components/ui/Modal';

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

interface UserItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [title, setTitle] = useState('');

  const currentUserId = user?.id;

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/conversations');
      return data as Conversation[];
    },
    refetchInterval: 60000 // Fallback polling every 60s; WebSocket handles real-time
  });

  const { data: convDetail } = useQuery({
    queryKey: ['conversation', selectedConv],
    queryFn: async () => {
      if (!selectedConv) return null;
      const { data } = await apiClient.get(`/conversations/${selectedConv}`);
      return data as { conversation: Conversation; messages: MessageItem[]; participants: Conversation['participants'] };
    },
    refetchInterval: 30000,
    enabled: !!selectedConv
  });

  // Real-time message listener via WebSocket
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'chat_message') return;
    const payload = lastMessage.data as { conversationId: number; message: MessageItem; sender: { firstName: string; lastName: string } };
    if (payload.conversationId === selectedConv) {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
    }
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [lastMessage, selectedConv, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [convDetail?.messages]);

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

  const { data: users = [] } = useQuery({
    queryKey: ['users-search', userSearch],
    enabled: modalOpen && userSearch.length > 1,
    queryFn: async () => {
      const { data } = await apiClient.get(`/users?search=${encodeURIComponent(userSearch)}&limit=20`);
      return (data?.data || []) as UserItem[];
    }
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/conversations', {
        participantIds: selectedUsers,
        title: title.trim() || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      closeModal();
    }
  });

  const closeModal = () => {
    setModalOpen(false);
    setUserSearch('');
    setSelectedUsers([]);
    setTitle('');
  };

  const toggleUser = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const getParticipantName = (senderId: number, participants: Conversation['participants']) => {
    if (senderId === currentUserId) return 'Moi';
    const p = participants.find((p) => p.id === senderId);
    return p ? `${p.firstName} ${p.lastName}` : 'Utilisateur';
  };

  return (
    <PageWrapper>
      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold">Comment envoyer un message ?</p>
          <p className="mt-1">
            Creez une nouvelle conversation en selectionnant un ou plusieurs collegues. Les messages sont envoyes en temps reel si vous etes connecte. Sinon, ils seront synchronises a votre prochaine connexion.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messagerie</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nouvelle conversation
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 overflow-hidden flex h-[32rem]">
        <div className="w-72 border-r dark:border-slate-700 flex flex-col">
          <div className="p-3 border-b dark:border-slate-700 font-medium text-sm text-gray-900 dark:text-white flex items-center justify-between">
            <span>Conversations</span>
            {conversations.length > 0 && (
              <span className="text-xs text-gray-400">{conversations.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <div className="p-4 text-center">
                <MessageCircle size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Aucune conversation.</p>
                <p className="text-xs text-gray-400 mt-1">Creez-en une pour commencer.</p>
              </div>
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
              <div className="p-3 border-b dark:border-slate-700 font-medium text-sm text-gray-900 dark:text-white flex items-center justify-between">
                <span>
                  {convDetail.conversation.title || convDetail.participants.map((p) => `${p.firstName} ${p.lastName}`).join(', ')}
                </span>
                <span className="text-xs text-gray-400">{convDetail.participants.length} participant{convDetail.participants.length > 1 ? 's' : ''}</span>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {convDetail.messages.map((m) => {
                  const isMe = m.senderId === currentUserId;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <span className="text-xs text-gray-500 dark:text-slate-400 mb-0.5">
                        {getParticipantName(m.senderId, convDetail.participants)}
                      </span>
                      <div
                        className={`px-3 py-2 rounded-lg text-sm max-w-[70%] ${
                          isMe
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {m.content}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
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
                  disabled={!message.trim() || sendMessage.isPending}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
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

      <Modal open={modalOpen} onClose={closeModal} title="Nouvelle conversation">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Titre (optionnel)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
              placeholder="Ex: Projet Alpha"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Participants <span className="text-gray-400 font-normal">({selectedUsers.length} selectionne{selectedUsers.length > 1 ? 's' : ''})</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
              Tapez le nom ou l'email d'un collegue pour le trouver, puis cliquez pour l'ajouter.
            </p>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white outline-none"
                placeholder="Ex: Marie Dupont ou marie@entreprise.com"
              />
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((uid) => {
                const u = users.find((x) => x.id === uid);
                if (!u) return null;
                return (
                  <span
                    key={uid}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs rounded-full"
                  >
                    {u.firstName} {u.lastName}
                    <button onClick={() => toggleUser(uid)} className="hover:text-indigo-900">
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto border dark:border-slate-700 rounded-lg">
            {users.length === 0 && userSearch.length > 1 ? (
              <div className="p-4 text-center">
                <Search size={20} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Aucun utilisateur trouve.</p>
                <p className="text-xs text-gray-400 mt-1">Essayez avec un autre nom ou email.</p>
              </div>
            ) : userSearch.length <= 1 ? (
              <div className="p-4 text-center">
                <Users size={20} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">Commencez a taper pour chercher...</p>
              </div>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${
                    selectedUsers.includes(u.id) ? 'bg-indigo-50 dark:bg-indigo-900/10' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300">
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  {selectedUsers.includes(u.id) && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Users size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => createConversation.mutate()}
              disabled={selectedUsers.length === 0 || createConversation.isPending}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Creer
            </button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
