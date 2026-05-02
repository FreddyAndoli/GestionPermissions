import { getRedisClient } from '../config/redis';

const PERMISSIONS_TTL = parseInt(process.env.REDIS_PERMISSIONS_TTL || '900');

export const cacheUserPermissions = async (userId: number, permissions: Record<string, boolean>) => {
  const redis = await getRedisClient();
  await redis.setEx(`permissions:${userId}`, PERMISSIONS_TTL, JSON.stringify(permissions));
};

export const getCachedPermissions = async (userId: number): Promise<Record<string, boolean> | null> => {
  const redis = await getRedisClient();
  const data = await redis.get(`permissions:${userId}`);
  return data ? JSON.parse(data) : null;
};

export const invalidatePermissions = async (userId: number) => {
  const redis = await getRedisClient();
  await redis.del(`permissions:${userId}`);
};

export const trackLoginAttempt = async (identifier: string): Promise<number> => {
  const redis = await getRedisClient();
  const key = `login_attempts:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 3600);
  }
  return count;
};

export const getLoginAttempts = async (identifier: string): Promise<number> => {
  const redis = await getRedisClient();
  const count = await redis.get(`login_attempts:${identifier}`);
  return count ? parseInt(count) : 0;
};

export const lockAccount = async (identifier: string, durationSeconds: number) => {
  const redis = await getRedisClient();
  await redis.setEx(`account_locked:${identifier}`, durationSeconds, '1');
};

export const isAccountLocked = async (identifier: string): Promise<boolean> => {
  const redis = await getRedisClient();
  const locked = await redis.get(`account_locked:${identifier}`);
  return !!locked;
};

export const unlockAccount = async (identifier: string) => {
  const redis = await getRedisClient();
  await redis.del(`account_locked:${identifier}`);
  await redis.del(`login_attempts:${identifier}`);
};
