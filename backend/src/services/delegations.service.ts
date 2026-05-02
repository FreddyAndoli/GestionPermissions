import { db } from '../config/db';
import { delegations, users, departments, auditLogs } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const listDelegations = async (filters: { managerId?: number; active?: boolean }) => {
  const conditions = [];
  if (filters.managerId) conditions.push(eq(delegations.managerId, filters.managerId));
  if (filters.active !== undefined) conditions.push(eq(delegations.isActive, filters.active));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(delegations).where(where!);

  const result = [];
  for (const d of rows) {
    const [manager] = await db.select().from(users).where(eq(users.id, d.managerId)).limit(1);
    const [delegate] = await db.select().from(users).where(eq(users.id, d.delegateId)).limit(1);
    result.push({ ...d, manager, delegate });
  }
  return result;
};

export const createDelegation = async (input: { managerId: number; delegateId: number; startDate: string; endDate: string }) => {
  // Check for overlapping delegations
  const existing = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.managerId, input.managerId),
        eq(delegations.isActive, true),
        lte(delegations.startDate, new Date(input.endDate)),
        gte(delegations.endDate, new Date(input.startDate))
      )
    );

  if (existing.length > 0) throw new Error('Overlapping delegation exists');

  const [result] = await db.insert(delegations).values({
    managerId: input.managerId,
    delegateId: input.delegateId,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate)
  });

  await db.insert(auditLogs).values({
    actorId: input.managerId,
    action: 'delegation.created',
    entityType: 'delegation',
    entityId: result.insertId,
    newValues: input
  });

  const [row] = await db.select().from(delegations).where(eq(delegations.id, result.insertId)).limit(1);
  return row;
};

export const updateDelegation = async (id: number, input: { delegateId?: number; startDate?: string; endDate?: string }) => {
  const updates: any = {};
  if (input.delegateId !== undefined) updates.delegateId = input.delegateId;
  if (input.startDate !== undefined) updates.startDate = new Date(input.startDate);
  if (input.endDate !== undefined) updates.endDate = new Date(input.endDate);

  await db.update(delegations).set(updates).where(eq(delegations.id, id));
  const [row] = await db.select().from(delegations).where(eq(delegations.id, id)).limit(1);
  return row;
};

export const revokeDelegation = async (id: number) => {
  await db.update(delegations).set({ isActive: false }).where(eq(delegations.id, id));
};

export const checkDelegation = async (managerId: number, date = new Date()) => {
  const [delegation] = await db
    .select()
    .from(delegations)
    .where(
      and(
        eq(delegations.managerId, managerId),
        eq(delegations.isActive, true),
        lte(delegations.startDate, date),
        gte(delegations.endDate, date)
      )
    )
    .limit(1);
  return delegation || null;
};

export const expireDelegations = async () => {
  const today = new Date();
  const expired = await db
    .select()
    .from(delegations)
    .where(and(eq(delegations.isActive, true), lte(delegations.endDate, today)));

  for (const d of expired) {
    await db.update(delegations).set({ isActive: false }).where(eq(delegations.id, d.id));
  }

  return expired.length;
};
