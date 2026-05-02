import { db } from '../config/db';
import {
  users, userPermissions, userRoles, rolePermissions,
  departments, departmentRoles, permissions
} from '../db/schema';
import { eq, and, isNull, gte, or } from 'drizzle-orm';
import { getCachedPermissions, cacheUserPermissions, invalidatePermissions } from './redis.service';
import { EffectivePermissions, PermissionResolution } from '../types';

export const resolveEffectivePermissions = async (userId: number): Promise<EffectivePermissions> => {
  // Check cache first
  const cached = await getCachedPermissions(userId);
  if (cached) {
    return {
      permissions: cached,
      resolutionChain: Object.entries(cached).map(([slug, granted]) => ({
        permissionSlug: slug,
        granted,
        source: 'direct',
        reason: 'cached'
      }))
    };
  }

  // Get user with department
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { permissions: {}, resolutionChain: [] };

  const resultMap = new Map<string, { granted: boolean; source: string; sourceName?: string }>();
  const resolutionChain: PermissionResolution[] = [];

  // Level 4: Department roles
  if (user.departmentId) {
    const deptRoles = await db
      .select({ roleId: departmentRoles.roleId })
      .from(departmentRoles)
      .where(eq(departmentRoles.departmentId, user.departmentId));

    for (const dr of deptRoles) {
      const perms = await db
        .select({ slug: permissions.slug, name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, dr.roleId));

      for (const p of perms) {
        if (!resultMap.has(p.slug)) {
          resultMap.set(p.slug, { granted: true, source: 'department', sourceName: `dept:${user.departmentId}` });
        }
      }
    }
  }

  // Level 3: User roles
  const uRoles = await db
    .select({ roleId: userRoles.roleId, expiresAt: userRoles.expiresAt })
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        or(isNull(userRoles.expiresAt), gte(userRoles.expiresAt, new Date()))
      )
    );

  for (const ur of uRoles) {
    const perms = await db
      .select({ slug: permissions.slug, name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, ur.roleId));

    for (const p of perms) {
      if (!resultMap.has(p.slug)) {
        resultMap.set(p.slug, { granted: true, source: 'role', sourceName: `role:${ur.roleId}` });
      }
    }
  }

  // Level 1 & 2: Direct user permissions
  const directPerms = await db
    .select({ slug: permissions.slug, granted: userPermissions.granted, name: permissions.name })
    .from(userPermissions)
    .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  for (const p of directPerms) {
    // Direct permission always overrides role/department
    resultMap.set(p.slug, { granted: p.granted, source: 'direct', sourceName: 'direct' });
  }

  // Build final permissions object
  const permissionsResult: Record<string, boolean> = {};
  for (const [slug, info] of resultMap) {
    permissionsResult[slug] = info.granted;
    resolutionChain.push({
      permissionSlug: slug,
      granted: info.granted,
      source: info.source as any,
      sourceName: info.sourceName,
      reason: info.source === 'direct' ? (info.granted ? 'Directly granted' : 'Explicitly denied') : `Inherited from ${info.source}`
    });
  }

  // Cache result
  await cacheUserPermissions(userId, permissionsResult);

  return { permissions: permissionsResult, resolutionChain };
};

export const hasPermission = async (userId: number, permissionSlug: string): Promise<boolean> => {
  const { permissions } = await resolveEffectivePermissions(userId);
  return permissions[permissionSlug] === true;
};

export const invalidateUserPermissions = async (userId: number) => {
  await invalidatePermissions(userId);
};
