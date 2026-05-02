import { INotificationProvider } from './notification.provider';
import { TelegramProvider } from './telegram.provider';
import { FirebaseProvider } from './firebase.provider';
import { db } from '../config/db';
import { userPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';

export class HybridProvider implements INotificationProvider {
  private telegram = new TelegramProvider();
  private firebase = new FirebaseProvider();

  async send(userId: number, event: string, payload: any): Promise<void> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (prefs?.telegramChatId) {
      await this.telegram.send(userId, event, payload);
    } else {
      await this.firebase.send(userId, event, payload);
    }
  }
}
