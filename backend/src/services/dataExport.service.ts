import { db } from '../config/db';
import {
  users, userPreferences, userRoles, roles, userPermissions, permissions,
  leaveRequests, leaveTypes, leavePeriods, leaveComments, leaveQuotas,
  messages, conversations, notifications, auditLogs,
  delegations, proxyRequests, departments, departmentMembers,
  subDepartments, subDepartmentMembers
} from '../db/schema';
import { eq, or, and } from 'drizzle-orm';

export const exportUserData = async (userId: number, isAdmin: boolean) => {
  // Admin export is limited to audit logs of their own actions
  if (isAdmin) {
    const adminAudit = await db.select().from(auditLogs)
      .where(eq(auditLogs.actorId, userId))
      .orderBy(auditLogs.createdAt);
    return {
      exportType: 'admin',
      userId,
      generatedAt: new Date().toISOString(),
      auditLogs: adminAudit,
      notice: 'Admin exports are limited to audit logs of their own actions for security.'
    };
  }

  // Full user export
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

  const roleAssignments = await db.select({ roleId: userRoles.roleId, name: roles.name })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  const directPermissions = await db.select({ permissionId: userPermissions.permissionId, slug: permissions.slug, granted: userPermissions.granted })
    .from(userPermissions)
    .leftJoin(permissions, eq(userPermissions.permissionId, permissions.id))
    .where(eq(userPermissions.userId, userId));

  const leaves = await db.select()
    .from(leaveRequests)
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(eq(leaveRequests.userId, userId));

  const leavePeriodsList = await db.select()
    .from(leavePeriods)
    .where(eq(leavePeriods.leaveRequestId, userId));

  const leaveCommentList = await db.select()
    .from(leaveComments)
    .where(eq(leaveComments.userId, userId));

  const quotas = await db.select()
    .from(leaveQuotas)
    .leftJoin(leaveTypes, eq(leaveQuotas.leaveTypeId, leaveTypes.id))
    .where(eq(leaveQuotas.userId, userId));

  const userMessages = await db.select()
    .from(messages)
    .leftJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(messages.senderId, userId));

  const notifs = await db.select()
    .from(notifications)
    .where(eq(notifications.userId, userId));

  const userAudit = await db.select()
    .from(auditLogs)
    .where(or(
      eq(auditLogs.actorId, userId),
      eq(auditLogs.targetUserId, userId)
    ))
    .orderBy(auditLogs.createdAt);

  const userDelegations = await db.select()
    .from(delegations)
    .where(or(
      eq(delegations.managerId, userId),
      eq(delegations.delegateId, userId)
    ));

  const userProxies = await db.select()
    .from(proxyRequests)
    .where(or(
      eq(proxyRequests.beneficiaryUserId, userId),
      eq(proxyRequests.proxyUserId, userId)
    ));

  const deptMemberships = await db.select({ departmentId: departmentMembers.departmentId, name: departments.name })
    .from(departmentMembers)
    .leftJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));

  const subDeptMemberships = await db.select({ subDepartmentId: subDepartmentMembers.subDepartmentId, name: subDepartments.name })
    .from(subDepartmentMembers)
    .leftJoin(subDepartments, eq(subDepartmentMembers.subDepartmentId, subDepartments.id))
    .where(eq(subDepartmentMembers.userId, userId));

  return {
    exportType: 'user',
    userId,
    generatedAt: new Date().toISOString(),
    profile: user,
    preferences: prefs,
    roles: roleAssignments,
    directPermissions,
    leaves,
    leavePeriods: leavePeriodsList,
    leaveComments: leaveCommentList,
    quotas,
    messages: userMessages,
    notifications: notifs,
    auditLogs: userAudit,
    delegations: userDelegations,
    proxyRequests: userProxies,
    departmentMemberships: deptMemberships,
    subDepartmentMemberships: subDeptMemberships
  };
};
