import { INotificationProvider } from './notification.provider';
import { TelegramProvider } from './telegram.provider';
import { FirebaseProvider } from './firebase.provider';
import { HybridProvider } from './hybrid.provider';
import { GmailProvider } from './gmail.provider';
import { createInAppNotification } from './notifications.service';
import { logger } from '../utils/logger';

const providerType = process.env.NOTIFICATION_PROVIDER || 'telegram';

let provider: INotificationProvider;
switch (providerType) {
  case 'telegram':
    provider = new TelegramProvider();
    break;
  case 'firebase':
    provider = new FirebaseProvider();
    break;
  case 'hybrid':
    provider = new HybridProvider();
    break;
  case 'gmail':
    provider = new GmailProvider();
    break;
  default:
    provider = new TelegramProvider();
}

export const sendViaProvider = async (userId: number, event: string, payload: any) => {
  try {
    await createInAppNotification({
      userId,
      type: event,
      title: payload.title || 'Notification',
      message: payload.message,
      data: payload
    });
    await provider.send(userId, event, payload);
  } catch (err) {
    logger.error('Notification send failed', { error: err });
  }
};
