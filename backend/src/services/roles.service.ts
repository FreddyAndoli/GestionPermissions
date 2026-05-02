import { db } from '../config/db';
import { roles, rolePermissions, permissions, userRoles, modules } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const listRoles = async (organizationId: number) => {
  return db.select().from(roles).where(eq(roles.organizationId, organizationId));
};

export const getRoleById = async (id: number) => {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role) return null;
  const perms = await db
    .select({ id: permissions.id, slug: permissions.slug, name: permissions.name, action: permissions.action, moduleId: permissions.moduleId })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, id));
  return { ...role, permissions: perms };
};

export const createRole = async (input: { name: string; description?: string; organizationId: number; permissionIds?: number[] }) => {
  const [result] = await db.insert(roles).values({
    name: input.name,
    description: input.description,
    organizationId: input.organizationId
  });
  const roleId = result.insertId;

  if (input.permissionIds?.length) {
    await db.insert(rolePermissions).values(
      input.permissionIds.map(pid => ({ roleId, permissionId: pid }))
    );
  }

  return getRoleById(roleId);
};

export const updateRole = async (id: number, input: { name?: string; description?: string; permissionIds?: number[] }) => {
  await db.update(roles).set(input).where(eq(roles.id, id));

  if (input.permissionIds !== undefined) {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (input.permissionIds.length) {
      await db.insert(rolePermissions).values(
        input.permissionIds.map(pid => ({ roleId: id, permissionId: pid }))
      );
    }
  }

  // Invalidate all users with this role
  const affectedUsers = await db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id));
  for (const u of affectedUsers) {
    await invalidateUserPermissions(u.userId);
  }

  return getRoleById(id);
};

export const deleteRole = async (id: number) => {
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (role?.isSystem) throw new Error('Cannot delete system role');

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
  await db.delete(userRoles).where(eq(userRoles.roleId, id));
  await db.delete(roles).where(eq(roles.id, id));
};

export const listPermissions = async (organizationId?: number) => {
  const perms = await db.select().from(permissions);
  const mods = await db.select().from(modules).where(eq(modules.organizationId, organizationId || 1));
  const modMap = new Map(mods.map(m => [m.id, m]));

  return perms.map(p => ({
    ...p,
    module: modMap.get(p.moduleId)
  }));
};
