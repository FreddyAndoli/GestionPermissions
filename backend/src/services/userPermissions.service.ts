import { db } from '../config/db';
import { userPermissions, permissions } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const getUserPermissions = async (userId: number) => {
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
    .where(eq(userPermissions.userId, userId));
  return rows;
};

export const setUserPermission = async (input: {
  userId: number;
  permissionId: number;
  granted: boolean;
  comment?: string;
}) => {
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
  return getUserPermissions(input.userId);
};

export const deleteUserPermission = async (id: number) => {
  const [row] = await db.select().from(userPermissions).where(eq(userPermissions.id, id)).limit(1);
  if (!row) return null;
  await db.delete(userPermissions).where(eq(userPermissions.id, id));
  await invalidateUserPermissions(row.userId);
  return row;
};
