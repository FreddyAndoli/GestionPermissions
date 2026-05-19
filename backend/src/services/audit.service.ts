import { db } from '../config/db';
import { auditLogs, users } from '../db/schema';
import { eq, and, gte, lte, like, sql } from 'drizzle-orm';

export const listAuditLogs = async (filters: {
  organizationId: number;
  actorId?: number;
  targetId?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(users.organizationId, filters.organizationId)
  ];
  if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId));
  if (filters.targetId) conditions.push(eq(auditLogs.targetUserId, filters.targetId));
  if (filters.action) conditions.push(like(auditLogs.action, `%${filters.action}%`));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(filters.dateTo)));

  const where = and(...conditions);
  const rows = await db
    .select()
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorId))
    .where(where)
    .orderBy(auditLogs.createdAt)
    .limit(limit)
    .offset(offset)
    .then((results) => results.map((r) => r.audit_logs));
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorId))
    .where(where);

  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
};

export const logAction = async (input: {
  actorId?: number;
  targetUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: any;
  newValues?: any;
  comment?: string;
  isDelegated?: boolean;
  delegatedById?: number;
  ipAddress?: string;
}) => {
  const [result] = await db.insert(auditLogs).values(input);
  return result.insertId;
};
