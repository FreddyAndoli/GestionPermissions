import { db } from '../config/db';
import { users, userPreferences, userRoles, roles, departments, leaveQuotas, leaveTypes, organizations } from '../db/schema';
import { eq, like, and, sql, inArray, notInArray } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';

export const checkIsSuperAdmin = async (userId: number): Promise<boolean> => {
  const [saRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'Super Admin')).limit(1);
  if (!saRole) return false;
  const [assignment] = await db.select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, saRole.id)))
    .limit(1);
  return !!assignment;
};

export const checkUserIsSuperAdmin = async (userId: number): Promise<boolean> => {
  return checkIsSuperAdmin(userId);
};

export const listUsers = async (filters: { organizationId: number; page?: number; limit?: number; search?: string; role?: string; status?: string; departmentId?: number; excludeSuperAdmin?: boolean }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(users.organizationId, filters.organizationId)];
  if (filters.search) conditions.push(like(users.email, `%${filters.search}%`));
  if (filters.status) conditions.push(eq(users.status, filters.status as any));
  if (filters.departmentId) conditions.push(eq(users.departmentId, filters.departmentId));

  if (filters.excludeSuperAdmin) {
    const [saRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'Super Admin')).limit(1);
    if (saRole) {
      const adminAssignments = await db.select({ userId: userRoles.userId })
        .from(userRoles)
        .where(eq(userRoles.roleId, saRole.id));
      const adminIds = adminAssignments.map(a => a.userId);
      if (adminIds.length > 0) {
        conditions.push(notInArray(users.id, adminIds));
      }
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.select().from(users).where(where!).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(where!);

  return { data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
};

export const getUserById = async (id: number, organizationId?: number) => {
  const conditions = [eq(users.id, id)];
  if (organizationId !== undefined) conditions.push(eq(users.organizationId, organizationId));
  const [user] = await db.select().from(users).where(and(...conditions)).limit(1);
  if (!user) return null;

  const userRoleList = await db.select({ id: roles.id, name: roles.name, description: roles.description })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, id));

  const [dept] = user.departmentId
    ? await db.select().from(departments).where(eq(departments.id, user.departmentId)).limit(1)
    : [null];

  return { ...user, roles: userRoleList.filter(r => r.id), department: dept };
};

export const createUser = async (input: { email: string; firstName: string; lastName: string; phoneNumber?: string; password?: string; organizationId: number; departmentId?: number; roleIds?: number[] }) => {
  const { firebaseAuth } = await import('../config/firebase');

  let firebaseUid: string;
  if (firebaseAuth && input.password) {
    const userRecord = await firebaseAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: `${input.firstName} ${input.lastName}`
    });
    firebaseUid = userRecord.uid;
  } else {
    firebaseUid = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const [result] = await db.insert(users).values({
    firebaseUid,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: input.phoneNumber,
    organizationId: input.organizationId,
    departmentId: input.departmentId,
    status: 'active'
  } as any);

  const userId = result.insertId;
  await db.insert(userPreferences).values({ userId, theme: 'system', density: 'normal', language: 'fr' } as any);

  if (input.roleIds?.length) {
    await db.insert(userRoles).values(input.roleIds.map(rid => ({ userId, roleId: rid })));
  } else {
    const [empRole] = await db.select().from(roles).where(eq(roles.name, 'Employe')).limit(1);
    if (empRole) await db.insert(userRoles).values({ userId, roleId: empRole.id });
  }

  // Initialize leave quotas
  const ltypes = await db.select().from(leaveTypes).where(eq(leaveTypes.organizationId, input.organizationId));
  const year = new Date().getFullYear();
  await db.insert(leaveQuotas).values(
    ltypes.map(lt => ({
      userId,
      leaveTypeId: lt.id,
      year,
      totalQuota: lt.defaultQuota || 0,
      usedDays: 0,
      pendingDays: 0,
      carriedOverDays: 0
    }))
  );

  return getUserById(userId);
};

export const updateUser = async (id: number, input: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; departmentId?: number | null; status?: 'active' | 'inactive' | 'locked' | 'pending' | 'suspended' }, organizationId?: number) => {
  const conditions = [eq(users.id, id)];
  if (organizationId !== undefined) conditions.push(eq(users.organizationId, organizationId));

  if (input.status && input.status !== 'active') {
    const isTargetSuperAdmin = await checkUserIsSuperAdmin(id);
    if (isTargetSuperAdmin) {
      throw new Error('Cannot change status of a Super Admin');
    }
  }

  await db.update(users).set(input as any).where(and(...conditions));
  await invalidateUserPermissions(id);
  return getUserById(id);
};

export const updateUserRoles = async (id: number, roleIds: number[]) => {
  const isTargetSuperAdmin = await checkUserIsSuperAdmin(id);
  if (isTargetSuperAdmin) {
    const [saRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'Super Admin')).limit(1);
    if (saRole && !roleIds.includes(saRole.id)) {
      throw new Error('Cannot remove Super Admin role from a Super Admin');
    }
  }

  await db.delete(userRoles).where(eq(userRoles.userId, id));
  if (roleIds.length > 0) {
    await db.insert(userRoles).values(roleIds.map(rid => ({ userId: id, roleId: rid })));
  }
  await invalidateUserPermissions(id);
  return getUserById(id);
};

export const resetUserPassword = async (id: number, newPassword: string) => {
  const user = await getUserById(id);
  if (!user) throw new Error('User not found');

  const { firebaseAuth } = await import('../config/firebase');
  if (firebaseAuth) {
    await firebaseAuth.updateUser(user.firebaseUid, { password: newPassword });
  }
  return { message: 'Password updated' };
};

export const deleteUser = async (id: number, organizationId?: number) => {
  const isTargetSuperAdmin = await checkUserIsSuperAdmin(id);
  if (isTargetSuperAdmin) {
    throw new Error('Cannot deactivate a Super Admin');
  }

  const conditions = [eq(users.id, id)];
  if (organizationId !== undefined) conditions.push(eq(users.organizationId, organizationId));
  await db.update(users).set({ status: 'inactive' }).where(and(...conditions));
  await invalidateUserPermissions(id);
};

export const bulkCreateUsers = async (
  items: { email: string; firstName: string; lastName: string; phoneNumber?: string; password?: string; roleIds?: number[]; departmentId?: number }[],
  organizationId: number
) => {
  const { firebaseAuth } = await import('../config/firebase');
  const results = [] as any[];
  const errors = [] as any[];

  for (const item of items) {
    try {
      let firebaseUid: string;

      if (firebaseAuth && item.password) {
        const userRecord = await firebaseAuth.createUser({
          email: item.email,
          password: item.password,
          displayName: `${item.firstName} ${item.lastName}`
        });
        firebaseUid = userRecord.uid;
      } else {
        firebaseUid = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const [result] = await db.insert(users).values({
        firebaseUid,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        phoneNumber: item.phoneNumber,
        organizationId,
        departmentId: item.departmentId,
        status: 'active'
      } as any);

      const userId = result.insertId;
      await db.insert(userPreferences).values({ userId, theme: 'system', density: 'normal', language: 'fr' } as any);

      if (item.roleIds?.length) {
        await db.insert(userRoles).values(item.roleIds.map(rid => ({ userId, roleId: rid })));
      } else {
        const [empRole] = await db.select().from(roles).where(eq(roles.name, 'Employe')).limit(1);
        if (empRole) await db.insert(userRoles).values({ userId, roleId: empRole.id });
      }

      const ltypes = await db.select().from(leaveTypes).where(eq(leaveTypes.organizationId, organizationId));
      const year = new Date().getFullYear();
      if (ltypes.length) {
        await db.insert(leaveQuotas).values(
          ltypes.map(lt => ({
            userId,
            leaveTypeId: lt.id,
            year,
            totalQuota: lt.defaultQuota || 0,
            usedDays: 0,
            pendingDays: 0,
            carriedOverDays: 0
          }))
        );
      }

      results.push({ email: item.email, status: 'created', userId });
    } catch (err: any) {
      errors.push({ email: item.email, error: err.message });
    }
  }

  return { created: results.length, errors, results };
};
