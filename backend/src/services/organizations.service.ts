import { db } from '../config/db';
import { organizations, users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const getOrganizationById = async (id: number) => {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return org || null;
};

export const getOrganizationByUserId = async (userId: number) => {
  const [user] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  return getOrganizationById(user.organizationId);
};

export const updateOrganization = async (id: number, data: { name?: string; slug?: string; settings?: any }) => {
  await db.update(organizations).set(data as any).where(eq(organizations.id, id));
  return getOrganizationById(id);
};
