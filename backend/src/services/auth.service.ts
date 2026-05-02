import { db } from '../config/db';
import { users, userPreferences, userRoles, roles, leaveTypes, leaveQuotas } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getRedisClient } from '../config/redis';
import { resolveEffectivePermissions, invalidateUserPermissions } from './permissionsResolver.service';
import { isAccountLocked, unlockAccount, trackLoginAttempt, lockAccount } from './redis.service';
import { logger } from '../utils/logger';
import { firebaseAuth } from '../config/firebase';

const LOGIN_ATTEMPTS_MAX = parseInt(process.env.REDIS_LOGIN_ATTEMPTS_MAX || '5');
const LOCKOUT_DURATION = parseInt(process.env.REDIS_LOCKOUT_DURATION || '900');

export const syncFirebaseUser = async (firebaseUid: string, email: string, firstName: string, lastName: string) => {
  const [existing] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
  if (existing) return existing;

  const orgId = await getDefaultOrgId();
  const [newUser] = await db.insert(users).values({
    firebaseUid,
    email,
    firstName,
    lastName,
    organizationId: orgId
  });

  const userId = newUser.insertId;
  await db.insert(userPreferences).values({ userId, theme: 'system', density: 'normal', language: 'fr' });

  const [created] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return created;
};

export const getCurrentUser = async (userId: number) => {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const { permissions } = await resolveEffectivePermissions(userId);
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return { ...user, effectivePermissions: permissions, preferences: prefs || null };
};

export const logoutUser = async (token: string) => {
  const redis = await getRedisClient();
  await redis.del(`token:${token}`);
};

export const handleLoginAttempt = async (email: string, ipAddress: string, success: boolean, userId?: number) => {
  const identifier = userId ? `user:${userId}` : `email:${email}`;

  if (await isAccountLocked(identifier)) {
    logger.warn('Login attempt on locked account', { email, ipAddress });
    return { locked: true };
  }

  if (!success) {
    const attempts = await trackLoginAttempt(identifier);
    if (attempts >= LOGIN_ATTEMPTS_MAX) {
      await lockAccount(identifier, LOCKOUT_DURATION);
      logger.warn('Account locked due to failed attempts', { email, ipAddress, attempts });
      return { locked: true, duration: LOCKOUT_DURATION };
    }
    return { locked: false, attempts };
  }

  await unlockAccount(identifier);
  return { locked: false, attempts: 0 };
};

export const unblockUser = async (userId: number) => {
  await db.update(users).set({ status: 'active' }).where(eq(users.id, userId));
  await invalidateUserPermissions(userId);
  await unlockAccount(`user:${userId}`);
};

const getDefaultOrgId = async () => {
  const rows = await db.select({ id: users.id }).from(users).limit(1);
  if (rows.length > 0) {
    const [u] = await db.select({ organizationId: users.organizationId }).from(users).where(eq(users.id, rows[0].id)).limit(1);
    return u?.organizationId || 1;
  }
  return 1;
};

export const registerUser = async (input: { email: string; password: string; firstName: string; lastName: string }) => {
  let firebaseUid: string;

  if (firebaseAuth) {
    const userRecord = await firebaseAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: `${input.firstName} ${input.lastName}`
    });
    firebaseUid = userRecord.uid;
  } else {
    // Dev fallback when Firebase is not configured
    firebaseUid = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const dbUser = await syncFirebaseUser(firebaseUid, input.email, input.firstName, input.lastName);

  // Assign default "Employe" role
  const [employeeRole] = await db.select().from(roles).where(eq(roles.name, 'Employe')).limit(1);
  if (employeeRole) {
    await db.insert(userRoles).values({ userId: dbUser.id, roleId: employeeRole.id });
  }

  // Initialize leave quotas for active leave types
  const types = await db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true));
  const currentYear = new Date().getFullYear();
  for (const lt of types) {
    await db.insert(leaveQuotas).values({
      userId: dbUser.id,
      leaveTypeId: lt.id,
      year: currentYear,
      totalQuota: lt.defaultQuota || 0,
      usedDays: 0,
      pendingDays: 0,
      carriedOverDays: 0
    });
  }

  return dbUser;
};
