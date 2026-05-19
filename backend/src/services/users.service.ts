import { db } from '../config/db';
import { users, userPreferences, userRoles, roles, departments, leaveQuotas, leaveTypes, organizations, userPermissions, departmentMembers, subDepartmentMembers, leaveRequests, leaveComments, leaveStatusHistory, leaveCarryOverLogs, proxyRequests, notifications, loginAttempts, auditLogs, announcementDismissals, conversationParticipants, consentLogs, messages } from '../db/schema';
import { eq, like, and, sql, inArray, notInArray } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';
import { generateTempPassword, createSetPasswordToken } from './passwordToken.service';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { recordDefaultConsents } from './consent.service';

const getSuperAdminRoleId = async (): Promise<number | null> => {
  const [saRole] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, 'Super Admin')).limit(1);
  return saRole?.id ?? null;
};

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
  const saRoleId = await getSuperAdminRoleId();
  if (input.roleIds?.length && saRoleId !== null && input.roleIds.includes(saRoleId)) {
    throw new Error('Super Admin role cannot be assigned through the API');
  }

  const { firebaseAuth } = await import('../config/firebase');

  // Admin-created users always get a system-generated temporary password.
  // Admin-provided passwords are ignored so the admin never knows the password.
  const tempPassword = generateTempPassword();

  let firebaseUid: string;
  if (firebaseAuth) {
    const userRecord = await firebaseAuth.createUser({
      email: input.email,
      password: tempPassword,
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
  if (input.departmentId) {
    try {
      await db.insert(departmentMembers).values({ departmentId: input.departmentId, userId } as any);
    } catch (err: any) {
      logger.warn('Failed to add user to departmentMembers (may already exist)', { userId, departmentId: input.departmentId, error: err.message });
    }
  }
  await db.insert(userPreferences).values({ userId, theme: 'system', density: 'normal', language: 'fr' } as any);

  try {
    await recordDefaultConsents(userId);
  } catch (err) {
    logger.error('Failed to record default consents', { error: err, userId });
  }

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

  // Send welcome email with temp password and set-password link (2h token)
  try {
    const token = await createSetPasswordToken(userId, input.email);
    await emailService.sendWelcomeEmail(input.email, input.firstName, tempPassword, token);
  } catch (err) {
    logger.error('Failed to send welcome email', { error: err, userId, email: input.email });
  }

  return getUserById(userId);
};

export const updateUser = async (id: number, input: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; departmentId?: number | null; status?: 'active' | 'inactive' | 'locked' }, organizationId?: number) => {
  const conditions = [eq(users.id, id)];
  if (organizationId !== undefined) conditions.push(eq(users.organizationId, organizationId));

  if (input.status && input.status !== 'active') {
    const isTargetSuperAdmin = await checkUserIsSuperAdmin(id);
    if (isTargetSuperAdmin) {
      throw new Error('Cannot change status of a Super Admin');
    }
  }

  await db.update(users).set(input as any).where(and(...conditions));

  if (input.departmentId !== undefined) {
    await db.delete(departmentMembers).where(eq(departmentMembers.userId, id));
    if (input.departmentId) {
      try {
        await db.insert(departmentMembers).values({ departmentId: input.departmentId, userId: id } as any);
      } catch (err: any) {
        logger.warn('Failed to sync departmentMembers on update', { userId: id, departmentId: input.departmentId, error: err.message });
      }
    }
  }

  await invalidateUserPermissions(id);
  return getUserById(id);
};

export const updateUserRoles = async (id: number, roleIds: number[]) => {
  const isTargetSuperAdmin = await checkUserIsSuperAdmin(id);
  const saRoleId = await getSuperAdminRoleId();

  if (saRoleId !== null && roleIds.includes(saRoleId)) {
    if (!isTargetSuperAdmin) {
      throw new Error('Super Admin role cannot be assigned through the API');
    }
  }

  if (isTargetSuperAdmin) {
    if (saRoleId !== null && !roleIds.includes(saRoleId)) {
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

  // Fetch user details before deactivation for the notification email
  const [targetUser] = await db.select().from(users).where(and(...conditions)).limit(1);

  await db.update(users).set({ status: 'inactive' }).where(and(...conditions));
  await invalidateUserPermissions(id);

  if (targetUser) {
    try {
      await emailService.sendAccountDeletedEmail(targetUser.email, targetUser.firstName);
    } catch (err) {
      logger.error('Failed to send account deleted email', { error: err, userId: id, email: targetUser.email });
    }
  }
};

export const bulkCreateUsers = async (
  items: { email: string; firstName: string; lastName: string; phoneNumber?: string; password?: string; roleIds?: number[]; departmentId?: number }[],
  organizationId: number
) => {
  const { firebaseAuth } = await import('../config/firebase');
  const results = [] as any[];
  const errors = [] as any[];
  const saRoleId = await getSuperAdminRoleId();

  for (const item of items) {
    try {
      if (item.roleIds?.length && saRoleId !== null && item.roleIds.includes(saRoleId)) {
        throw new Error('Super Admin role cannot be assigned through the API');
      }

      const tempPassword = generateTempPassword();
      let firebaseUid: string;

      if (firebaseAuth) {
        const userRecord = await firebaseAuth.createUser({
          email: item.email,
          password: tempPassword,
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

      try {
        await recordDefaultConsents(userId);
      } catch (err) {
        logger.error('Failed to record default consents (bulk)', { error: err, userId });
      }

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

      try {
        const token = await createSetPasswordToken(userId, item.email);
        await emailService.sendWelcomeEmail(item.email, item.firstName, tempPassword, token);
      } catch (err) {
        logger.error('Failed to send welcome email (bulk)', { error: err, userId, email: item.email });
      }

      results.push({ email: item.email, status: 'created', userId });
    } catch (err: any) {
      errors.push({ email: item.email, error: err.message });
    }
  }

  return { created: results.length, errors, results };
};

export const hardDeleteUser = async (id: number, organizationId?: number) => {
  const conditions = [eq(users.id, id)];
  if (organizationId !== undefined) conditions.push(eq(users.organizationId, organizationId));

  const [targetUser] = await db.select().from(users).where(and(...conditions)).limit(1);
  if (!targetUser) {
    throw new Error('User not found');
  }

  // Delete from Firebase Auth first (best effort)
  try {
    const { firebaseAuth } = await import('../config/firebase');
    if (firebaseAuth && targetUser.firebaseUid && !targetUser.firebaseUid.startsWith('dev_')) {
      await firebaseAuth.deleteUser(targetUser.firebaseUid);
    }
  } catch (err: any) {
    logger.error('Failed to delete Firebase user during hard delete', { userId: id, firebaseUid: targetUser.firebaseUid, error: err.message });
    // Continue with DB cleanup even if Firebase delete fails
  }

  // Cascade delete all related records — resilient to missing tables
  const safeDelete = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (err: any) {
      if (err?.cause?.code === 'ER_NO_SUCH_TABLE') {
        logger.warn(`Hard delete: table ${label} does not exist, skipping`, { userId: id });
      } else {
        logger.error(`Hard delete: failed to clean up ${label}`, { userId: id, error: err.message });
      }
    }
  };

  await safeDelete('userPreferences', () => db.delete(userPreferences).where(eq(userPreferences.userId, id)));
  await safeDelete('userRoles', () => db.delete(userRoles).where(eq(userRoles.userId, id)));
  await safeDelete('userPermissions', () => db.delete(userPermissions).where(eq(userPermissions.userId, id)));
  await safeDelete('departmentMembers', () => db.delete(departmentMembers).where(eq(departmentMembers.userId, id)));
  await safeDelete('subDepartmentMembers', () => db.delete(subDepartmentMembers).where(eq(subDepartmentMembers.userId, id)));
  await safeDelete('leaveQuotas', () => db.delete(leaveQuotas).where(eq(leaveQuotas.userId, id)));
  await safeDelete('leaveCarryOverLogs', () => db.delete(leaveCarryOverLogs).where(eq(leaveCarryOverLogs.userId, id)));
  await safeDelete('proxyRequests', async () => {
    await db.delete(proxyRequests).where(eq(proxyRequests.beneficiaryUserId, id));
    await db.delete(proxyRequests).where(eq(proxyRequests.proxyUserId, id));
  });
  await safeDelete('notifications', () => db.delete(notifications).where(eq(notifications.userId, id)));
  await safeDelete('loginAttempts', () => db.delete(loginAttempts).where(eq(loginAttempts.userId, id)));
  await safeDelete('announcementDismissals', () => db.delete(announcementDismissals).where(eq(announcementDismissals.userId, id)));
  await safeDelete('conversationParticipants', () => db.delete(conversationParticipants).where(eq(conversationParticipants.userId, id)));
  await safeDelete('consentLogs', () => db.delete(consentLogs).where(eq(consentLogs.userId, id)));
  await safeDelete('messages', () => db.delete(messages).where(eq(messages.senderId, id)));
  await safeDelete('leaveComments', () => db.delete(leaveComments).where(eq(leaveComments.userId, id)));
  await safeDelete('leaveStatusHistory', () => db.delete(leaveStatusHistory).where(eq(leaveStatusHistory.changedByUserId, id)));
  await safeDelete('auditLogs', async () => {
    await db.update(auditLogs).set({ actorId: null }).where(eq(auditLogs.actorId, id));
    await db.update(auditLogs).set({ targetUserId: null }).where(eq(auditLogs.targetUserId, id));
  });
  await safeDelete('leaveRequests', async () => {
    await db.update(leaveRequests).set({ managerId: null }).where(eq(leaveRequests.managerId, id));
    await db.update(leaveRequests).set({ submittedByUserId: null }).where(eq(leaveRequests.submittedByUserId, id));
    await db.update(leaveRequests).set({ replacementUserId: null }).where(eq(leaveRequests.replacementUserId, id));
    await db.delete(leaveRequests).where(eq(leaveRequests.userId, id));
  });

  // Finally delete the user
  await db.delete(users).where(and(...conditions));
  await invalidateUserPermissions(id);

  logger.info('User hard deleted', { userId: id, email: targetUser.email });
  return { message: 'User deleted permanently' };
};
