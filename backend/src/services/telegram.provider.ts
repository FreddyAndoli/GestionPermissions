import axios from 'axios';
import { db } from '../config/db';
import { userPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { INotificationProvider } from './notification.provider';
import { logger } from '../utils/logger';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export class TelegramProvider implements INotificationProvider {
  async send(userId: number, event: string, payload: any): Promise<void> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
    if (!prefs?.telegramChatId) {
      logger.info(`No telegram_chat_id for user ${userId}`, { event });
      return;
    }

    const message = this.formatMessage(event, payload);
    const body: any = {
      chat_id: prefs.telegramChatId,
      text: message,
      parse_mode: 'Markdown'
    };

    // Add inline keyboard for leave requests
    if (event === 'leave.pending' && payload.leaveId) {
      body.reply_markup = {
        inline_keyboard: [
          [
            { text: 'Approuver', callback_data: `approve_leave:${payload.leaveId}` },
            { text: 'Rejeter', callback_data: `reject_leave:${payload.leaveId}` }
          ],
          [
            { text: 'Voir le detail', url: `${process.env.NEXT_PUBLIC_APP_URL}/leaves/${payload.leaveId}` }
          ]
        ]
      };
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, body);
  }

  private formatMessage(event: string, payload: any): string {
    switch (event) {
      case 'leave.pending':
        return `*Nouvelle demande de conge*\n\nEmploye : ${payload.employeeName}\nPeriode : ${payload.startDate} au ${payload.endDate}\nJours : ${payload.days}\nType : ${payload.leaveType}\n\nMotif : ${payload.reason || '-'}`;
      case 'leave.approved':
        return `Conge approuve : ${payload.days} jours du ${payload.startDate}`;
      case 'leave.rejected':
        return `Conge refuse : ${payload.reason || ''}`;
      case 'role.assigned':
        return `Nouveau role : ${payload.roleName}`;
      case 'delegation.created':
        return `Delegation active de ${payload.managerName} vers ${payload.delegateName} du ${payload.startDate} au ${payload.endDate}`;
      default:
        return `Notification : ${event}`;
    }
  }
}
