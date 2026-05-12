import { db } from '../config/db';
import { announcements, announcementDismissals, users, userRoles, roles } from '../db/schema';
import { eq, and, or, isNull, gte } from 'drizzle-orm';
import { broadcastAnnouncement } from './websocket.service';
import { sendViaProvider } from './notification.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

interface CreateAnnouncementInput {
  organizationId: number;
  authorId: number;
  title: string;
  message: string;
  level?: 'info' | 'warning' | 'critical';
  isDismissible?: boolean;
  expiresAt?: Date | null;
  targetRoles?: string[];
  sendEmail?: boolean;
}

export const createAnnouncement = async (input: CreateAnnouncementInput) => {
  const [result] = await db.insert(announcements).values({
    organizationId: input.organizationId,
    authorId: input.authorId,
    title: input.title,
    message: input.message,
    level: input.level || 'info',
    isDismissible: input.isDismissible !== false,
    expiresAt: input.expiresAt || null
  });

  const [announcement] = await db.select().from(announcements).where(eq(announcements.id, result.insertId)).limit(1);

  // Broadcast via WebSocket
  const wsRecipients = broadcastAnnouncement({
    id: announcement.id,
    title: announcement.title,
    message: announcement.message,
    level: announcement.level || 'info',
    organizationId: announcement.organizationId,
    targetRoles: input.targetRoles
  });

  // Send email if requested
  let emailRecipients = 0;
  if (input.sendEmail) {
    emailRecipients = await sendAnnouncementEmails(announcement, input.targetRoles);
  }

  logger.info('Announcement created', {
    announcementId: announcement.id,
    wsRecipients,
    emailRecipients,
    targetRoles: input.targetRoles
  });

  return { announcement, wsRecipients, emailRecipients };
};

async function sendAnnouncementEmails(
  announcement: typeof announcements.$inferSelect,
  targetRoles?: string[]
) {
  try {
    const allUsers = await db
      .select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(and(eq(users.organizationId, announcement.organizationId), eq(users.status, 'active')));

    let recipients = allUsers;

    if (targetRoles && targetRoles.length > 0) {
      const userRoleRows = await db
        .select({ userId: userRoles.userId, roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(
          and(
            eq(roles.organizationId, announcement.organizationId),
            or(...targetRoles.map(r => eq(roles.name, r)))
          )
        );

      const allowedUserIds = new Set(userRoleRows.map(r => r.userId));
      recipients = allUsers.filter(u => allowedUserIds.has(u.id));
    }

    for (const user of recipients) {
      try {
        await emailService.send(
          user.email,
          `[Permission Manager] ${announcement.title}`,
          buildAnnouncementEmailHtml(announcement, user.firstName)
        );
      } catch (err) {
        logger.error('Failed to send announcement email', { userId: user.id, error: (err as Error).message });
      }
    }

    return recipients.length;
  } catch (err) {
    logger.error('Send announcement emails error', { error: (err as Error).message });
    return 0;
  }
}

function buildAnnouncementEmailHtml(
  announcement: typeof announcements.$inferSelect,
  firstName: string
): string {
  const levelColor =
    announcement.level === 'critical' ? '#DC2626' : announcement.level === 'warning' ? '#F59E0B' : '#4F46E5';
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${levelColor};">${announcement.title}</h2>
      <p>Bonjour ${firstName},</p>
      <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; white-space: pre-line;">${announcement.message}</p>
      </div>
      <p style="color: #6B7280; font-size: 12px;">Cette annonce a été publiée sur la plateforme Permission Manager.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
      <p style="color: #6B7280; font-size: 12px;">Permission Manager</p>
    </div>
  `;
}

export const listActiveAnnouncements = async (userId: number, organizationId: number) => {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.organizationId, organizationId),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
      )
    );

  const dismissals = await db
    .select()
    .from(announcementDismissals)
    .where(eq(announcementDismissals.userId, userId));

  const dismissedIds = new Set(dismissals.map(d => d.announcementId));

  return rows.filter(r => !dismissedIds.has(r.id) || !r.isDismissible);
};

export const dismissAnnouncement = async (userId: number, announcementId: number) => {
  await db.insert(announcementDismissals).values({
    announcementId,
    userId
  });
  return { message: 'Dismissed' };
};
