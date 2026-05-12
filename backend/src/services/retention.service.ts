import { db } from '../config/db';
import {
  auditLogs, loginAttempts, notifications, invitations, messages
} from '../db/schema';
import { lt, and, eq, notInArray } from 'drizzle-orm';
import { logger } from '../utils/logger';

const RETENTION_DAYS = {
  auditLogs: parseInt(process.env.RETENTION_AUDIT_DAYS || '2555'),        // 7 years
  loginAttempts: parseInt(process.env.RETENTION_LOGIN_ATTEMPTS_DAYS || '365'), // 1 year
  notifications: parseInt(process.env.RETENTION_NOTIFICATIONS_DAYS || '180'),   // 6 months
  invitations: parseInt(process.env.RETENTION_INVITATIONS_DAYS || '30'),        // 30 days
  messages: parseInt(process.env.RETENTION_MESSAGES_DAYS || '730'),              // 2 years
};

function cutoffDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

export const runRetentionCleanup = async () => {
  logger.info('Running GDPR retention cleanup');

  try {
    // 1. Login attempts (1 year)
    await db.delete(loginAttempts)
      .where(lt(loginAttempts.createdAt, cutoffDate(RETENTION_DAYS.loginAttempts)));
    logger.info('Cleaned old login attempts');

    // 2. Notifications (6 months)
    await db.delete(notifications)
      .where(lt(notifications.createdAt, cutoffDate(RETENTION_DAYS.notifications)));
    logger.info('Cleaned old notifications');

    // 3. Expired invitations (30 days)
    await db.delete(invitations)
      .where(lt(invitations.createdAt, cutoffDate(RETENTION_DAYS.invitations)));
    logger.info('Cleaned old invitations');

    // 4. Old messages — anonymize content instead of hard delete (keep conversation skeleton)
    await db.update(messages)
      .set({ content: '[Message supprimé — conservation légale]' })
      .where(lt(messages.createdAt, cutoffDate(RETENTION_DAYS.messages)));
    logger.info('Anonymized old messages');

    // 5. Audit logs (7 years) — longest retention for legal compliance
    await db.delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoffDate(RETENTION_DAYS.auditLogs)));
    logger.info('Cleaned old audit logs');

    logger.info('GDPR retention cleanup completed');
  } catch (err) {
    logger.error('GDPR retention cleanup failed', { error: err });
    throw err;
  }
};
