import { db } from '../config/db';
import { blackoutPeriods } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const listBlackoutPeriods = async (filters: { organizationId?: number; departmentId?: number; year?: number }) => {
  const conditions = [];
  if (filters.organizationId) conditions.push(eq(blackoutPeriods.organizationId, filters.organizationId));
  if (filters.departmentId) conditions.push(eq(blackoutPeriods.departmentId, filters.departmentId));
  if (filters.year) {
    const start = new Date(filters.year, 0, 1);
    const end = new Date(filters.year, 11, 31);
    conditions.push(gte(blackoutPeriods.startDate, start));
    conditions.push(lte(blackoutPeriods.endDate, end));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(blackoutPeriods).where(where!);
};

export const createBlackoutPeriod = async (input: {
  organizationId: number;
  departmentId?: number;
  startDate: string;
  endDate: string;
  message?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  createdBy: number;
}) => {
  const [result] = await db.insert(blackoutPeriods).values({
    organizationId: input.organizationId,
    departmentId: input.departmentId,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    message: input.message || '',
    isRecurring: input.isRecurring ?? false,
    recurrenceRule: input.recurrenceRule || null,
    createdBy: input.createdBy
  } as any);
  const [row] = await db.select().from(blackoutPeriods).where(eq(blackoutPeriods.id, result.insertId)).limit(1);
  return row;
};

export const updateBlackoutPeriod = async (id: number, input: Partial<{
  departmentId: number;
  startDate: string;
  endDate: string;
  message: string;
  isRecurring: boolean;
  recurrenceRule: string;
}>) => {
  const values: any = {};
  if (input.departmentId !== undefined) values.departmentId = input.departmentId;
  if (input.startDate) values.startDate = new Date(input.startDate);
  if (input.endDate) values.endDate = new Date(input.endDate);
  if (input.message !== undefined) values.message = input.message;
  if (input.isRecurring !== undefined) values.isRecurring = input.isRecurring;
  if (input.recurrenceRule !== undefined) values.recurrenceRule = input.recurrenceRule;

  await db.update(blackoutPeriods).set(values).where(eq(blackoutPeriods.id, id));
  const [row] = await db.select().from(blackoutPeriods).where(eq(blackoutPeriods.id, id)).limit(1);
  return row;
};

export const deleteBlackoutPeriod = async (id: number) => {
  await db.delete(blackoutPeriods).where(eq(blackoutPeriods.id, id));
  return { message: 'Deleted' };
};
