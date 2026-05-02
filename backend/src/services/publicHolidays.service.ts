import { db } from '../config/db';
import { publicHolidays } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export const listPublicHolidays = async (filters: { year?: number; countryCode?: string }) => {
  const conditions = [];
  if (filters.year) {
    const start = new Date(filters.year, 0, 1);
    const end = new Date(filters.year, 11, 31);
    conditions.push(gte(publicHolidays.holidayDate, start));
    conditions.push(lte(publicHolidays.holidayDate, end));
  }
  if (filters.countryCode) {
    conditions.push(eq(publicHolidays.countryCode, filters.countryCode));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(publicHolidays).where(where!);
};

export const createPublicHoliday = async (input: {
  organizationId: number;
  name: string;
  holidayDate: string;
  countryCode?: string;
  isCustom?: boolean;
}) => {
  const [result] = await db.insert(publicHolidays).values({
    organizationId: input.organizationId,
    name: input.name,
    holidayDate: new Date(input.holidayDate),
    countryCode: input.countryCode,
    isCustom: input.isCustom ?? true
  });
  const [row] = await db.select().from(publicHolidays).where(eq(publicHolidays.id, result.insertId)).limit(1);
  return row;
};

export const updatePublicHoliday = async (id: number, input: Partial<{
  name: string;
  holidayDate: string;
  countryCode: string;
  isCustom: boolean;
}>) => {
  const values: any = {};
  if (input.name) values.name = input.name;
  if (input.holidayDate) values.holidayDate = new Date(input.holidayDate);
  if (input.countryCode !== undefined) values.countryCode = input.countryCode;
  if (input.isCustom !== undefined) values.isCustom = input.isCustom;

  await db.update(publicHolidays).set(values).where(eq(publicHolidays.id, id));
  const [row] = await db.select().from(publicHolidays).where(eq(publicHolidays.id, id)).limit(1);
  return row;
};

export const deletePublicHoliday = async (id: number) => {
  await db.delete(publicHolidays).where(eq(publicHolidays.id, id));
  return { message: 'Deleted' };
};
