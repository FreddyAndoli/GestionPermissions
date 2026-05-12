import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { db } from '../config/db';
import { users, userRoles, roles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

interface WSClient {
  socket: WebSocket;
  userId: number;
  organizationId: number;
  roleNames: string[];
  isAlive: boolean;
}

const clients = new Map<WebSocket, WSClient>();
let wss: WebSocketServer | null = null;

export const initWebSocketServer = (server: Server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (socket, req) => {
    try {
      const { query } = parse(req.url || '', true);
      const token = query.token as string | undefined;

      if (!token) {
        socket.close(4001, 'Missing token');
        return;
      }

      // Verify token via Redis cache or Firebase (simplified: decode basic JWT or query DB by token)
      // In this app, the frontend sends the Firebase ID token. We can't easily verify it here
      // without Firebase Admin, so we'll use a simpler approach: the frontend sends userId + token,
      // and we verify the token via our existing auth cache in Redis.
      // However, for simplicity and to avoid duplicating Firebase auth, we'll accept a
      // 'userId' query param and verify via a short-lived WS ticket in Redis.
      // Actually, let's just verify the Firebase token using the same approach as REST.
      const user = await authenticateWsUser(token);
      if (!user) {
        socket.close(4002, 'Invalid token');
        return;
      }

      const roleNames = await getUserRoleNames(user.id);

      const client: WSClient = {
        socket,
        userId: user.id,
        organizationId: user.organizationId,
        roleNames,
        isAlive: true
      };

      clients.set(socket, client);
      logger.info('WebSocket client connected', { userId: user.id, organizationId: user.organizationId });

      socket.on('pong', () => {
        client.isAlive = true;
      });

      socket.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          handleClientMessage(client, payload);
        } catch {
          socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
        }
      });

      socket.on('close', () => {
        clients.delete(socket);
        logger.info('WebSocket client disconnected', { userId: user.id });
      });

      socket.on('error', (err) => {
        logger.error('WebSocket error', { userId: user.id, error: err.message });
      });

      // Send initial connection ack
      socket.send(JSON.stringify({ type: 'connected', userId: user.id }));
    } catch (err) {
      logger.error('WebSocket connection error', { error: (err as Error).message });
      socket.close(4003, 'Internal error');
    }
  });

  // Heartbeat interval
  const heartbeat = setInterval(() => {
    for (const [socket, client] of clients) {
      if (!client.isAlive) {
        socket.terminate();
        clients.delete(socket);
        continue;
      }
      client.isAlive = false;
      socket.ping();
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  logger.info('WebSocket server initialized on /ws');
};

async function authenticateWsUser(token: string) {
  // Use the same Redis-cached user verification as REST API.
  // The frontend sends the Firebase ID token. We look it up in Redis first.
  try {
    const { getRedisClient } = await import('../config/redis');
    const redis = await getRedisClient();
    const cacheKey = `token:${token}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      const userPayload = JSON.parse(cached);
      // Refresh TTL
      const REDIS_SESSION_TTL = parseInt(process.env.REDIS_SESSION_TTL || '3600');
      await redis.expire(cacheKey, REDIS_SESSION_TTL);
      return {
        id: userPayload.id as number,
        organizationId: userPayload.organizationId as number
      };
    }

    // Fallback: verify with Firebase Admin directly
    const { firebaseAuth } = await import('../config/firebase');
    if (!firebaseAuth) {
      // Dev bypass
      if (process.env.NODE_ENV === 'development' && process.env.DEV_SECRET) {
        // In dev, token might be our dev token. Try to find user by email from dev header
        // Not applicable here since WS only sends token in query.
        // We'll allow a special dev token pattern: "dev:{email}"
        if (token.startsWith('dev:')) {
          const email = token.slice(4);
          const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (dbUser) {
            return { id: dbUser.id, organizationId: dbUser.organizationId };
          }
        }
      }
      return null;
    }

    const decoded = await firebaseAuth.verifyIdToken(token);
    const firebaseUid = decoded.uid;
    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    if (!dbUser) return null;

    // Cache for next time
    const REDIS_SESSION_TTL = parseInt(process.env.REDIS_SESSION_TTL || '3600');
    const userPayload = {
      id: dbUser.id,
      firebaseUid: dbUser.firebaseUid,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      avatarUrl: dbUser.avatarUrl,
      organizationId: dbUser.organizationId,
      departmentId: dbUser.departmentId,
      status: dbUser.status || 'active',
      role: dbUser.role,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
    };
    await redis.setEx(cacheKey, REDIS_SESSION_TTL, JSON.stringify(userPayload));

    return { id: dbUser.id, organizationId: dbUser.organizationId };
  } catch (err) {
    logger.error('WS auth error', { error: (err as Error).message });
    return null;
  }
}

async function getUserRoleNames(userId: number): Promise<string[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return rows.map(r => r.name);
}

function handleClientMessage(client: WSClient, payload: any) {
  switch (payload.type) {
    case 'ping':
      client.socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    case 'subscribe':
      // Future: channel subscriptions
      client.socket.send(JSON.stringify({ type: 'subscribed', channel: payload.channel }));
      break;
    default:
      client.socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

export const broadcastAnnouncement = (payload: {
  id: number;
  title: string;
  message: string;
  level: string;
  organizationId: number;
  targetRoles?: string[];
}) => {
  const message = JSON.stringify({
    type: 'announcement',
    data: {
      id: payload.id,
      title: payload.title,
      message: payload.message,
      level: payload.level,
      createdAt: new Date().toISOString()
    }
  });

  let count = 0;
  for (const client of clients.values()) {
    if (client.organizationId !== payload.organizationId) continue;
    if (payload.targetRoles && payload.targetRoles.length > 0) {
      const hasTargetRole = payload.targetRoles.some(r => client.roleNames.includes(r));
      if (!hasTargetRole) continue;
    }
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(message);
      count++;
    }
  }

  logger.info('Announcement broadcast', { announcementId: payload.id, recipients: count });
  return count;
};

export const getConnectedClientsCount = (): number => clients.size;

export const sendToUser = (userId: number, payload: any): boolean => {
  let sent = false;
  for (const client of clients.values()) {
    if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(payload));
      sent = true;
    }
  }
  return sent;
};
