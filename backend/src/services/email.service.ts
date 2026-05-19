import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Prefer App Password (SMTP) — simplest and most reliable
    if (GMAIL_SENDER_EMAIL && GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: GMAIL_SENDER_EMAIL,
          pass: GMAIL_APP_PASSWORD
        }
      });
      logger.info('EmailService: Gmail SMTP (App Password) ready', { sender: GMAIL_SENDER_EMAIL });
      return;
    }

    // Fall back to OAuth2
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
      logger.info('EmailService: Gmail OAuth2 transporter ready', { sender: GMAIL_SENDER_EMAIL });
      return;
    }

    logger.warn('EmailService: Gmail not configured. Transactional emails will be logged only.', {
      hasSenderEmail: !!GMAIL_SENDER_EMAIL,
      hasAppPassword: !!GMAIL_APP_PASSWORD,
      hasClientId: !!GMAIL_CLIENT_ID,
      hasClientSecret: !!GMAIL_CLIENT_SECRET,
      hasRefreshToken: !!GMAIL_REFRESH_TOKEN
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      logger.info(`[Email logged - not sent] To: ${to}, Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: `"Permission Manager" <${GMAIL_SENDER_EMAIL}>`,
        to,
        subject,
        html
      });
      logger.info('Transactional email sent', { to, subject });
    } catch (err: any) {
      logger.error('Transactional email failed', { error: err.message || err, to, subject, code: err.code });
      throw err;
    }
  }

  async sendWelcomeEmail(to: string, firstName: string, tempPassword: string, token: string): Promise<void> {
    const setPasswordUrl = `${APP_URL}/set-password?token=${encodeURIComponent(token)}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Bienvenue sur Permission Manager</h2>
        <p>Bonjour ${firstName},</p>
        <p>Un administrateur a créé votre compte. Voici vos informations de connexion temporaires :</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
        </div>
        <p>Pour des raisons de sécurité, vous devez définir votre propre mot de passe en cliquant sur le lien ci-dessous. Ce lien est valable <strong>2 heures</strong>.</p>
        <a href="${setPasswordUrl}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Définir mon mot de passe
        </a>
        <p style="color: #6B7280; font-size: 12px;">Si le bouton ne fonctionne pas, copiez ce lien : ${setPasswordUrl}</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #6B7280; font-size: 12px;">Permission Manager — Gestion des permissions et droits d'accès</p>
      </div>
    `;
    await this.send(to, 'Votre compte Permission Manager a été créé', html);
  }

  async sendAccountDeletedEmail(to: string, firstName: string): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #DC2626;">Compte désactivé</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre compte sur <strong>Permission Manager</strong> a été désactivé par un administrateur.</p>
        <p>Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur système.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #6B7280; font-size: 12px;">Permission Manager</p>
      </div>
    `;
    await this.send(to, 'Votre compte Permission Manager a été désactivé', html);
  }

  async sendPasswordResetOtp(to: string, firstName: string, otp: string, channel: 'email' | 'telegram'): Promise<void> {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Réinitialisation de mot de passe</h2>
        <p>Bonjour ${firstName},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :</p>
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
        </div>
        <p>Ce code est valable <strong>2 heures</strong>. Ne le partagez avec personne.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="color: #6B7280; font-size: 12px;">Permission Manager</p>
      </div>
    `;
    await this.send(to, 'Code de réinitialisation de mot de passe', html);
  }
}

export const emailService = new EmailService();
