import { db } from '../config/db';
import { userPermissions, permissions, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const getUserPermissions = async (userId: number, organizationId?: number) => {
  const conditions = [eq(userPermissions.userId, userId)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const rows = await db
    .select({
      id: userPermissions.id,
      userId: userPermissions.userId,
      permissionId: userPermissions.permissionId,
      granted: userPermissions.granted,
      comment: userPermissions.comment,
      createdAt: userPermissions.createdAt,
      updatedAt: userPermissions.updatedAt,
      permissionName: permissions.name,
      permissionSlug: permissions.slug,
      permissionAction: permissions.action
    })
    .from(userPermissions)
    .leftJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .innerJoin(users, eq(users.id, userPermissions.userId))
    .where(and(...conditions));
  return rows;
};

export const setUserPermission = async (input: {
  userId: number;
  permissionId: number;
  granted: boolean;
  comment?: string;
}, organizationId?: number) => {
  if (organizationId !== undefined) {
    const [user] = await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.organizationId, organizationId))).limit(1);
    if (!user) throw new Error('User not found');
  }
  const [existing] = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, input.userId),
        eq(userPermissions.permissionId, input.permissionId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(userPermissions)
      .set({ granted: input.granted, comment: input.comment || existing.comment })
      .where(eq(userPermissions.id, existing.id));
  } else {
    await db.insert(userPermissions).values({
      userId: input.userId,
      permissionId: input.permissionId,
      granted: input.granted,
      comment: input.comment
    } as any);
  }

  await invalidateUserPermissions(input.userId);
  return getUserPermissions(input.userId, organizationId);
};

export const deleteUserPermission = async (id: number, organizationId?: number) => {
  let conditions: any[] = [eq(userPermissions.id, id)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }
  const results = await db
    .select()
    .from(userPermissions)
    .innerJoin(users, eq(users.id, userPermissions.userId))
    .where(and(...conditions))
    .limit(1);
  const row = results[0]?.user_permissions;
  if (!row) return null;
  await db.delete(userPermissions).where(eq(userPermissions.id, id));
  await invalidateUserPermissions(row.userId);
  return row;
};
