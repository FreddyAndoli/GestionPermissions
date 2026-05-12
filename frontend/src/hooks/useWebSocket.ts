'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface AnnouncementMessage {
  type: 'announcement';
  data: {
    id: number;
    title: string;
    message: string;
    level: string;
    createdAt: string;
  };
}

export interface ConnectedMessage {
  type: 'connected';
  userId: number;
}

export type WSMessage = AnnouncementMessage | ConnectedMessage | { type: string; data?: any };

export function useWebSocket() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || (isSecure ? 'https://localhost:4000' : 'http://localhost:4000');
    // Remove any path (e.g. /api/v1) so the WS path is exactly /ws
    const baseOrigin = apiUrl.replace(/\/api\/.*$/, '').replace(/\/$/, '');
    const wsUrl = baseOrigin.replace(/^http/, 'ws') + `/ws?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WSMessage;
        setLastMessage(payload);
      } catch {
        // ignore invalid JSON
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  return { connected, lastMessage, send };
}
