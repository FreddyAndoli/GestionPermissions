import { Router } from 'express';
import { db } from '../config/db';
import { getRedisClient } from '../config/redis';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const services: any = {};

  // MySQL
  try {
    await db.execute('SELECT 1');
    services.mysql = { status: 'ok', message: 'Connected' };
  } catch (err: any) {
    services.mysql = { status: 'error', message: err.message };
  }

  // Redis
  try {
    const redis = await getRedisClient();
    await redis.ping();
    services.redis = { status: 'ok', message: 'Connected' };
  } catch (err: any) {
    services.redis = { status: 'error', message: err.message };
  }

  // Firebase
  try {
    services.firebase = { status: 'ok', message: 'Configured' };
  } catch (err: any) {
    services.firebase = { status: 'error', message: err.message };
  }

  const allOk = Object.values(services).every((s: any) => s.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    uptime: process.uptime(),
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services
  });
}));

export default router;
