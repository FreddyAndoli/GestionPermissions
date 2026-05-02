import { db } from '../config/db';
import { userPreferences } from '../db/schema';
import { eq } from 'drizzle-orm';

export const getUserPreferences = async (userId: number) => {
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return prefs || null;
};

export const updateUserPreferences = async (userId: number, data: Partial<typeof userPreferences.$inferInsert>) => {
  const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  if (existing) {
    await db.update(userPreferences).set(data).where(eq(userPreferences.userId, userId));
  } else {
    await db.insert(userPreferences).values({ ...data, userId } as any);
  }
  return getUserPreferences(userId);
};
