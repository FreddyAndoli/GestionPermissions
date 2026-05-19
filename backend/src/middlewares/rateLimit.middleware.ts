import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

const WINDOW = parseInt(process.env.REDIS_RATE_LIMIT_WINDOW || '60');
const MAX = parseInt(process.env.REDIS_RATE_LIMIT_MAX || '100');

export const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const redis = await getRedisClient();
    const key = `rate_limit:${req.user?.id || req.ip}:${req.path}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, WINDOW);
    }

    if (current > MAX) {
      const ttl = await redis.ttl(key);
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: ttl
      });
      return;
    }

    next();
  } catch (err) {
    logger.error('Rate limiter error', { error: err });
    // Fail open is unsafe; fail closed with a 429 when Redis is unavailable.
    res.status(429).json({ error: 'Rate limiter unavailable. Please retry later.' });
  }
};
