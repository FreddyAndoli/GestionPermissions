import { db } from '../config/db';
import {
  users, userPreferences, userRoles, userPermissions,
  notifications, loginAttempts, messages, leaveComments,
  leaveRequests, proxyRequests, delegations, departmentMembers,
  subDepartmentMembers, conversationParticipants, announcementDismissals
} from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { invalidateUserPermissions } from './permissionsResolver.service';
import { logger } from '../utils/logger';

export const eraseUserData = async (userId: number, organizationId?: number, performedBy?: number) => {
  const conditions = [eq(users.id, userId)];
  if (organizationId !== undefined) {
    conditions.push(eq(users.organizationId, organizationId));
  }

  const [user] = await db.select().from(users).where(and(...conditions)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Delete personal preferences and notification settings
  await db.delete(userPreferences).where(eq(userPreferences.userId, userId));

  // 2. Delete role assignments and direct permissions
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

  // 3. Delete notifications and login attempts
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(loginAttempts).where(eq(loginAttempts.userId, userId));

  // 4. Anonymize messages content (keep conversation history skeleton)
  await db.update(messages)
    .set({ content: '[Message supprimé]' })
    .where(eq(messages.senderId, userId));

  // 5. Anonymize leave comments
  await db.update(leaveComments)
    .set({ content: '[Commentaire supprimé]' })
    .where(eq(leaveComments.userId, userId));

  // 6. Anonymize leave request personal fields
  await db.update(leaveRequests)
    .set({ reason: null, managerComment: null, directorComment: null })
    .where(eq(leaveRequests.userId, userId));

  // 7. Anonymize proxy requests
  await db.update(proxyRequests)
    .set({ reason: null })
    .where(or(
      eq(proxyRequests.beneficiaryUserId, userId),
      eq(proxyRequests.proxyUserId, userId)
    ));

  // 8. Remove from department memberships
  await db.delete(departmentMembers).where(eq(departmentMembers.userId, userId));
  await db.delete(subDepartmentMembers).where(eq(subDepartmentMembers.userId, userId));

  // 9. Remove from conversations and dismissals
  await db.delete(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  await db.delete(announcementDismissals).where(eq(announcementDismissals.userId, userId));

  // 10. Deactivate delegations where user is involved
  await db.update(delegations)
    .set({ isActive: false })
    .where(or(
      eq(delegations.managerId, userId),
      eq(delegations.delegateId, userId)
    ));

  // 11. Anonymize the user record (GDPR right to erasure — pseudonymization)
  await db.update(users)
    .set({
      email: `erased-${userId}@deleted.local`,
      firstName: 'Utilisateur',
      lastName: 'Supprimé',
      phoneNumber: null,
      avatarUrl: null,
      firebaseUid: `erased-${userId}`,
      status: 'inactive',
      departmentId: null,
      subDepartmentId: null
    })
    .where(eq(users.id, userId));

  await invalidateUserPermissions(userId);

  logger.info('User data erased (GDPR Art. 17)', {
    erasedUserId: userId,
    performedBy: performedBy || userId,
    organizationId: user.organizationId
  });
};
