import cron from 'node-cron';
import { db } from '../config/db';
import { leaveQuotas, leaveTypes, users, leaveCarryOverLogs, seniorityTiers } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { expireDelegations } from '../services/delegations.service';
import { logger } from '../utils/logger';

// Process carry-over on Jan 1st at 00:01
cron.schedule('1 0 1 1 *', async () => {
  logger.info('Running carry-over job');
  try {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const allUsers = await db.select().from(users).where(eq(users.status, 'active'));
    const types = await db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true));

    for (const user of allUsers) {
      for (const lt of types) {
        if (!lt.isCumulative) continue;

        const [prevQuota] = await db
          .select()
          .from(leaveQuotas)
          .where(and(
            eq(leaveQuotas.userId, user.id),
            eq(leaveQuotas.leaveTypeId, lt.id),
            eq(leaveQuotas.year, previousYear)
          ))
          .limit(1);

        if (!prevQuota) continue;

        const remaining = (prevQuota.totalQuota || 0) + (prevQuota.carriedOverDays || 0) - (prevQuota.usedDays || 0) - (prevQuota.pendingDays || 0);
        if (remaining <= 0) continue;

        const carryOverLimit = lt.carryOverLimit || 0;
        const daysToCarry = Math.min(remaining, carryOverLimit);
        const daysLost = remaining - daysToCarry;

        await db.insert(leaveCarryOverLogs).values({
          userId: user.id,
          leaveTypeId: lt.id,
          yearFrom: previousYear,
          yearTo: currentYear,
          daysCarriedOver: daysToCarry,
          daysLost,
          reason: 'Report automatique annuel'
        });

        const [existingQuota] = await db
          .select()
          .from(leaveQuotas)
          .where(and(
            eq(leaveQuotas.userId, user.id),
            eq(leaveQuotas.leaveTypeId, lt.id),
            eq(leaveQuotas.year, currentYear)
          ))
          .limit(1);

        if (existingQuota) {
          await db.update(leaveQuotas)
            .set({ carriedOverDays: daysToCarry })
            .where(eq(leaveQuotas.id, existingQuota.id));
        } else {
          await db.insert(leaveQuotas).values({
            userId: user.id,
            leaveTypeId: lt.id,
            year: currentYear,
            totalQuota: lt.defaultQuota || 0,
            usedDays: 0,
            pendingDays: 0,
            carriedOverDays: daysToCarry
          });
        }
      }
    }

    logger.info('Carry-over job completed');
  } catch (err) {
    logger.error('Carry-over job failed', { error: err });
  }
});

// Process seniority bonuses every day at 00:01
cron.schedule('1 0 * * *', async () => {
  logger.info('Running seniority job');
  try {
    const today = new Date();
    const allUsers = await db.select().from(users).where(eq(users.status, 'active'));
    const tiers = await db.select().from(seniorityTiers);

    for (const user of allUsers) {
      if (!user.createdAt) continue;
      const years = Math.floor((today.getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365));

      let totalBonus = 0;
      for (const tier of tiers) {
        if (years >= tier.yearsRequired) {
          totalBonus += tier.bonusDays;
        }
      }

      if (totalBonus > 0 && user.organizationId) {
        const currentYear = today.getFullYear();
        const orgTiers = tiers.filter(t => t.organizationId === user.organizationId);
        for (const tier of orgTiers) {
          if (!tier.leaveTypeId) continue;
          const [quota] = await db
            .select()
            .from(leaveQuotas)
            .where(and(
              eq(leaveQuotas.userId, user.id),
              eq(leaveQuotas.leaveTypeId, tier.leaveTypeId),
              eq(leaveQuotas.year, currentYear)
            ))
            .limit(1);

          if (quota) {
            // Recalculate total quota: default + all applicable tier bonuses
            let applicableBonus = 0;
            for (const t of orgTiers) {
              if (years >= t.yearsRequired && t.leaveTypeId === tier.leaveTypeId) {
                applicableBonus += t.bonusDays;
              }
            }
            await db.update(leaveQuotas)
              .set({ totalQuota: (quota.totalQuota || 0) })
              .where(eq(leaveQuotas.id, quota.id));
          }
        }
      }
    }

    logger.info('Seniority job completed');
  } catch (err) {
    logger.error('Seniority job failed', { error: err });
  }
});

// Expire delegations every day at 00:01
cron.schedule('1 0 * * *', async () => {
  logger.info('Running delegation expiration job');
  try {
    const count = await expireDelegations();
    logger.info('Delegation expiration job completed', { expiredCount: count });
  } catch (err) {
    logger.error('Delegation expiration job failed', { error: err });
  }
});

logger.info('Cron workers scheduled');
