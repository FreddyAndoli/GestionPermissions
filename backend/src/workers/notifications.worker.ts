import { Worker } from 'bullmq';
import { sendViaProvider } from '../services/notification.service';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { userId, event, payload } = job.data;
    logger.info('Processing notification job', { jobId: job.id, userId, event });
    await sendViaProvider(userId, event, payload);
  },
  {
    connection: { url: redisUrl },
    concurrency: 5
  }
);

notificationWorker.on('completed', (job) => {
  logger.info('Notification job completed', { jobId: job.id });
});

notificationWorker.on('failed', (job, err) => {
  logger.error('Notification job failed', { jobId: job?.id, error: err.message });
});
