import './config/env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { getRedisClient } from './config/redis';
import { connection } from './config/db';
import { logger } from './utils/logger';
import './workers/notifications.worker';
import './workers/cron.worker';

const app = express();
const PORT = process.env.PORT || 4000;

const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [];
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1', routes);

// Global error handler
app.use(errorMiddleware);

const waitForDatabase = async (retries = 10, delayMs = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connection.query('SELECT 1');
      logger.info('Database connected');
      return;
    } catch (err) {
      logger.warn(`Database not ready, attempt ${i + 1}/${retries}`, { error: (err as Error).message });
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
};

const startServer = async () => {
  try {
    const redis = await getRedisClient();
    logger.info('Redis connected');

    await waitForDatabase();

    const server = app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        logger.info('HTTP server closed');
      });
      try {
        const redisClient = await getRedisClient();
        await redisClient.quit();
        logger.info('Redis connection closed');
      } catch { /* ignore */ }
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();
