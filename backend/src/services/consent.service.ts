import { db } from '../config/db';
import { consentLogs } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const recordConsent = async (
  userId: number,
  purpose: string,
  lawfulBasis: string,
  ipAddress?: string
) => {
  const [existing] = await db
    .select()
    .from(consentLogs)
    .where(
      and(
        eq(consentLogs.userId, userId),
        eq(consentLogs.purpose, purpose),
        isNull(consentLogs.withdrawnAt)
      )
    )
    .limit(1);

  if (existing) return existing;

  const [result] = await db.insert(consentLogs).values({
    userId,
    purpose,
    lawfulBasis,
    ipAddress
  } as any);

  return result.insertId;
};

export const recordDefaultConsents = async (userId: number, ipAddress?: string) => {
  await recordConsent(userId, 'account_management', 'contract', ipAddress);
  await recordConsent(userId, 'leave_processing', 'contract', ipAddress);
  await recordConsent(userId, 'notifications', 'legitimate_interest', ipAddress);
  await recordConsent(userId, 'analytics', 'consent', ipAddress);
};

export const getUserConsents = async (userId: number) => {
  return db.select().from(consentLogs).where(eq(consentLogs.userId, userId));
};

export const withdrawConsent = async (userId: number, purpose: string) => {
  await db
    .update(consentLogs)
    .set({ withdrawnAt: new Date() })
    .where(
      and(
        eq(consentLogs.userId, userId),
        eq(consentLogs.purpose, purpose),
        isNull(consentLogs.withdrawnAt)
      )
    );
};
