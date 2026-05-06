import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const notificationQueue = new Queue('notifications', {
  connection: { url: redisUrl }
});

export const addNotificationJob = async (userId: number, event: string, payload: any) => {
  await notificationQueue.add('send-notification', {
    userId,
    event,
    payload,
    timestamp: new Date().toISOString()
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400, count: 100 },
    removeOnFail: { age: 604800, count: 50 }
  });
};
