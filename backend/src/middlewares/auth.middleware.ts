import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { getRedisClient } from '../config/redis';
import { db } from '../config/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

const REDIS_SESSION_TTL = parseInt(process.env.REDIS_SESSION_TTL || '3600');
const IS_DEV = process.env.NODE_ENV === 'development';
const DEV_SECRET = process.env.DEV_SECRET;

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: missing token' });
      return;
    }

    const token = authHeader.substring(7);
    const redis = await getRedisClient();
    const cacheKey = `token:${token}`;

    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      req.user = JSON.parse(cached);
      await redis.expire(cacheKey, REDIS_SESSION_TTL);
      next();
      return;
    }

    // Dev bypass: only in development, only with matching DEV_SECRET
    const devSecretHeader = req.headers['x-dev-secret'] as string | undefined;
    const isDevBypass = IS_DEV && DEV_SECRET && devSecretHeader === DEV_SECRET;

    if ((!firebaseAuth && IS_DEV && isDevBypass) || isDevBypass) {
      const devEmail = req.headers['x-dev-user-email'] as string | undefined;
      if (!devEmail) {
        res.status(401).json({ error: 'Unauthorized: dev mode requires x-dev-user-email header' });
        return;
      }

      const [dbUser] = await db.select().from(users).where(eq(users.email, devEmail)).limit(1);
      if (!dbUser) {
        res.status(401).json({ error: 'Unauthorized: user not found' });
        return;
      }

      if (dbUser.status === 'locked') {
        res.status(403).json({ error: 'Account locked' });
        return;
      }

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
      } as any;

      await redis.setEx(cacheKey, REDIS_SESSION_TTL, JSON.stringify(userPayload));
      req.user = userPayload;
      next();
      return;
    }

    if (!firebaseAuth) {
      res.status(500).json({ error: 'Firebase Auth not configured' });
      return;
    }

    // Verify with Firebase
    const decoded = await firebaseAuth.verifyIdToken(token);
    const firebaseUid = decoded.uid;

    // Find user in DB
    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    if (!dbUser) {
      res.status(401).json({ error: 'Unauthorized: user not found' });
      return;
    }

    if (dbUser.status === 'locked') {
      res.status(403).json({ error: 'Account locked' });
      return;
    }

    const userPayload = {
      id: dbUser.id,
      firebaseUid: dbUser.firebaseUid,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      avatarUrl: dbUser.avatarUrl,
      organizationId: dbUser.organizationId,
      departmentId: dbUser.departmentId,
      status: dbUser.status,
      role: dbUser.role,
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt
    };

    // Cache in Redis for remaining token lifetime
    const ttl = Math.min(REDIS_SESSION_TTL, decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : REDIS_SESSION_TTL);
    await redis.setEx(cacheKey, Math.max(ttl, 60), JSON.stringify(userPayload));

    req.user = userPayload as any;
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err });
    res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};
