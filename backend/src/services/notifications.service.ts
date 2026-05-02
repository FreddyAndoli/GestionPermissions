import { db } from '../config/db';
import { notifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

export const createInAppNotification = async (input: { userId: number; type: string; title: string; message?: string; data?: any }) => {
  const [result] = await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    data: input.data
  });
  const [row] = await db.select().from(notifications).where(eq(notifications.id, result.insertId)).limit(1);
  return row;
};

export const listNotifications = async (userId: number) => {
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(notifications.createdAt);
};

export const markAsRead = async (id: number) => {
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id));
};

export const markAllAsRead = async (userId: number) => {
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.userId, userId));
};

export const sendNotification = async (userId: number, event: string, payload: any) => {
  try {
    await createInAppNotification({
      userId,
      type: event,
      title: payload.title || 'Notification',
      message: payload.message,
      data: payload
    });

    // TODO: Queue via BullMQ based on NOTIFICATION_PROVIDER (telegram/firebase/hybrid)
    logger.info('Notification queued', { userId, event });
  } catch (err) {
    logger.error('Failed to send notification', { error: err });
  }
};
