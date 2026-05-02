import nodemailer from 'nodemailer';
import { INotificationProvider } from './notification.provider';
import { logger } from '../utils/logger';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL;

export class GmailProvider implements INotificationProvider {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER_EMAIL) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: GMAIL_SENDER_EMAIL,
          clientId: GMAIL_CLIENT_ID,
          clientSecret: GMAIL_CLIENT_SECRET,
          refreshToken: GMAIL_REFRESH_TOKEN
        }
      });
    } else {
      logger.warn('Gmail provider not fully configured');
    }
  }

  async send(userId: number, event: string, payload: any): Promise<void> {
    if (!this.transporter) {
      logger.info(`Gmail notification skipped (not configured)`, { userId, event });
      return;
    }

    const { subject, html } = this.formatEmail(event, payload);

    try {
      await this.transporter.sendMail({
        from: `"Permission Manager" <${GMAIL_SENDER_EMAIL}>`,
        to: payload.email || payload.recipientEmail,
        subject,
        html
      });
      logger.info('Gmail notification sent', { userId, event });
    } catch (err) {
      logger.error('Gmail send failed', { error: err, userId, event });
      throw err;
    }
  }

  private formatEmail(event: string, payload: any): { subject: string; html: string } {
    switch (event) {
      case 'leave.pending':
        return {
          subject: `Nouvelle demande de congé - ${payload.employeeName}`,
          html: `<h2>Nouvelle demande de congé</h2>
                 <p><strong>Employé :</strong> ${payload.employeeName}</p>
                 <p><strong>Période :</strong> ${payload.startDate} au ${payload.endDate}</p>
                 <p><strong>Jours :</strong> ${payload.days}</p>
                 <p><strong>Type :</strong> ${payload.leaveType}</p>
                 <p><strong>Motif :</strong> ${payload.reason || '-'}</p>`
        };
      case 'leave.approved':
        return {
          subject: `Congé approuvé`,
          html: `<h2>Votre demande de congé a été approuvée</h2>
                 <p><strong>Période :</strong> ${payload.startDate} au ${payload.endDate}</p>
                 <p><strong>Jours :</strong> ${payload.days}</p>`
        };
      case 'leave.rejected':
        return {
          subject: `Congé refusé`,
          html: `<h2>Votre demande de congé a été refusée</h2>
                 <p><strong>Raison :</strong> ${payload.reason || ''}</p>`
        };
      case 'role.assigned':
        return {
          subject: `Nouveau rôle attribué`,
          html: `<h2>Un nouveau rôle vous a été attribué</h2>
                 <p><strong>Rôle :</strong> ${payload.roleName}</p>`
        };
      case 'delegation.created':
        return {
          subject: `Délégation active`,
          html: `<h2>Délégation de pouvoir</h2>
                 <p><strong>Manager :</strong> ${payload.managerName}</p>
                 <p><strong>Délégataire :</strong> ${payload.delegateName}</p>
                 <p><strong>Période :</strong> ${payload.startDate} au ${payload.endDate}</p>`
        };
      default:
        return {
          subject: `Notification - ${event}`,
          html: `<p>${payload.message || 'Vous avez une nouvelle notification.'}</p>`
        };
    }
  }
}
