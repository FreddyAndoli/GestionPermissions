import { db } from '../config/db';
import { proxyRequests, users, permissions, auditLogs } from '../db/schema';
import { eq, or, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

export const createProxyRequest = async (input: {
  proxyUserId: number;
  beneficiaryUserId: number;
  permissionId: number;
  reason?: string;
}) => {
  const [beneficiary] = await db.select().from(users).where(eq(users.id, input.beneficiaryUserId)).limit(1);
  if (!beneficiary) throw new Error('Beneficiary not found');

  const [permission] = await db.select().from(permissions).where(eq(permissions.id, input.permissionId)).limit(1);
  if (!permission) throw new Error('Permission not found');

  const [result] = await db.insert(proxyRequests).values({
    proxyUserId: input.proxyUserId,
    beneficiaryUserId: input.beneficiaryUserId,
    permissionId: input.permissionId,
    reason: input.reason
  });

  const [row] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, result.insertId)).limit(1);

  await db.insert(auditLogs).values({
    actorId: input.proxyUserId,
    targetUserId: input.beneficiaryUserId,
    action: 'proxy_request.created',
    entityType: 'proxy_request',
    entityId: result.insertId,
    newValues: input
  });

  return row;
};

export const listProxyRequests = async (userId: number) => {
  const rows = await db
    .select()
    .from(proxyRequests)
    .where(or(eq(proxyRequests.proxyUserId, userId), eq(proxyRequests.beneficiaryUserId, userId)))
    .orderBy(proxyRequests.createdAt);

  const enriched = [];
  for (const r of rows) {
    const [proxy] = await db.select().from(users).where(eq(users.id, r.proxyUserId)).limit(1);
    const [beneficiary] = await db.select().from(users).where(eq(users.id, r.beneficiaryUserId)).limit(1);
    const [perm] = await db.select().from(permissions).where(eq(permissions.id, r.permissionId)).limit(1);
    enriched.push({
      ...r,
      proxyUser: proxy ? { id: proxy.id, firstName: proxy.firstName, lastName: proxy.lastName, email: proxy.email } : null,
      beneficiaryUser: beneficiary ? { id: beneficiary.id, firstName: beneficiary.firstName, lastName: beneficiary.lastName, email: beneficiary.email } : null,
      permission: perm ? { id: perm.id, name: perm.name, slug: perm.slug } : null
    });
  }
  return enriched;
};

export const confirmProxyRequest = async (id: number, beneficiaryUserId: number, status: 'confirmed' | 'rejected') => {
  const [row] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  if (!row) throw new Error('Proxy request not found');
  if (row.beneficiaryUserId !== beneficiaryUserId) throw new Error('Not authorized');

  await db.update(proxyRequests).set({ beneficiaryConfirmed: status }).where(eq(proxyRequests.id, id));

  await db.insert(auditLogs).values({
    actorId: beneficiaryUserId,
    action: `proxy_request.${status}`,
    entityType: 'proxy_request',
    entityId: id,
    newValues: { status }
  });

  const [updated] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  return updated;
};

export const approveProxyRequest = async (id: number, approverId: number) => {
  const [row] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  if (!row) throw new Error('Proxy request not found');
  if (row.beneficiaryConfirmed !== 'confirmed') throw new Error('Beneficiary has not confirmed the request');

  await db.insert(auditLogs).values({
    actorId: approverId,
    action: 'proxy_request.approved',
    entityType: 'proxy_request',
    entityId: id,
    newValues: { status: 'approved' }
  });

  return row;
};

export const deleteProxyRequest = async (id: number, userId: number) => {
  const [row] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  if (!row) throw new Error('Proxy request not found');
  if (row.proxyUserId !== userId) throw new Error('Not authorized');

  await db.delete(proxyRequests).where(eq(proxyRequests.id, id));
  return { message: 'Deleted' };
};
