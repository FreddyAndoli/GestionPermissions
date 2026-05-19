import { db } from '../config/db';
import { proxyRequests, users, permissions, modules, auditLogs } from '../db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

export const createProxyRequest = async (input: {
  proxyUserId: number;
  organizationId: number;
  beneficiaryUserId: number;
  permissionId: number;
  reason?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
}) => {
  const [beneficiary] = await db.select().from(users).where(eq(users.id, input.beneficiaryUserId)).limit(1);
  if (!beneficiary) throw new Error('Beneficiary not found');
  if (beneficiary.organizationId !== input.organizationId) throw new Error('Beneficiary does not belong to your organization');

  const [permission] = await db.select().from(permissions).where(eq(permissions.id, input.permissionId)).limit(1);
  if (!permission) throw new Error('Permission not found');

  const [moduleRow] = await db.select().from(modules).where(eq(modules.id, permission.moduleId)).limit(1);
  if (!moduleRow || moduleRow.organizationId !== input.organizationId) {
    throw new Error('Permission does not belong to your organization');
  }

  const [result] = await db.insert(proxyRequests).values({
    proxyUserId: input.proxyUserId,
    beneficiaryUserId: input.beneficiaryUserId,
    permissionId: input.permissionId,
    reason: input.reason,
    attachmentUrl: input.attachmentUrl,
    attachmentName: input.attachmentName,
    attachmentMimeType: input.attachmentMimeType
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

export const listProxyRequests = async (userId: number, organizationId: number) => {
  const rows = await db
    .select()
    .from(proxyRequests)
    .where(
      and(
        or(eq(proxyRequests.proxyUserId, userId), eq(proxyRequests.beneficiaryUserId, userId)),
        eq(users.organizationId, organizationId)
      )
    )
    .innerJoin(users, eq(users.id, proxyRequests.proxyUserId))
    .orderBy(proxyRequests.createdAt)
    .then((results) => results.map((r) => r.proxy_requests));

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.flatMap(r => [r.proxyUserId, r.beneficiaryUserId]))];
  const permissionIds = [...new Set(rows.map(r => r.permissionId))];

  const proxyUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
    .from(users)
    .where(inArray(users.id, userIds));

  const perms = await db
    .select({ id: permissions.id, name: permissions.name, slug: permissions.slug })
    .from(permissions)
    .where(inArray(permissions.id, permissionIds));

  const userMap = new Map(proxyUsers.map(u => [u.id, u]));
  const permMap = new Map(perms.map(p => [p.id, p]));

  return rows.map(r => ({
    ...r,
    proxyUser: userMap.get(r.proxyUserId) || null,
    beneficiaryUser: userMap.get(r.beneficiaryUserId) || null,
    permission: permMap.get(r.permissionId) || null
  }));
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

  await db.update(proxyRequests)
    .set({ status: 'approved', approvedBy: approverId, approvedAt: new Date() })
    .where(eq(proxyRequests.id, id));

  await db.insert(auditLogs).values({
    actorId: approverId,
    action: 'proxy_request.approved',
    entityType: 'proxy_request',
    entityId: id,
    newValues: { status: 'approved', approvedBy: approverId }
  });

  const [updated] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  return updated;
};

export const deleteProxyRequest = async (id: number, userId: number) => {
  const [row] = await db.select().from(proxyRequests).where(eq(proxyRequests.id, id)).limit(1);
  if (!row) throw new Error('Proxy request not found');
  if (row.proxyUserId !== userId) throw new Error('Not authorized');

  // Delete attachment file if present
  if (row.attachmentUrl) {
    try {
      const filename = path.basename(row.attachmentUrl);
      const filePath = path.resolve(process.env.PDF_STORAGE_PATH || './storage', '../proxy-attachments', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      logger.warn('Failed to delete proxy attachment file', { attachmentUrl: row.attachmentUrl, error: err });
    }
  }

  await db.delete(proxyRequests).where(eq(proxyRequests.id, id));
  return { message: 'Deleted' };
};
