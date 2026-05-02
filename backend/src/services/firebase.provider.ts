import axios from 'axios';
import { INotificationProvider } from './notification.provider';
import { logger } from '../utils/logger';

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

export class FirebaseProvider implements INotificationProvider {
  async send(userId: number, event: string, payload: any): Promise<void> {
    if (!FCM_SERVER_KEY) {
      logger.warn('FCM_SERVER_KEY not configured');
      return;
    }
    // In production, lookup FCM token from user_preferences and send push
    logger.info('Firebase notification queued', { userId, event });
  }
}
