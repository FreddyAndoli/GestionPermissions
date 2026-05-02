import { db } from '../config/db';
import { auditLogs } from '../db/schema';
import { eq, and, gte, lte, like, sql } from 'drizzle-orm';

export const listAuditLogs = async (filters: {
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

  const conditions = [];
  if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId));
  if (filters.targetId) conditions.push(eq(auditLogs.targetUserId, filters.targetId));
  if (filters.action) conditions.push(like(auditLogs.action, `%${filters.action}%`));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.dateFrom) conditions.push(gte(auditLogs.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(auditLogs.createdAt, new Date(filters.dateTo)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(auditLogs).where(where!).orderBy(auditLogs.createdAt).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where!);

  return { data: rows, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
};

export const logAction = async (input: {
  actorId?: number;
  targetUserId?: number;
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
