import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../config/db';
import { users, invitations, roles, userRoles, leaveQuotas, leaveTypes, organizations, userPreferences } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { firebaseAuth } from '../config/firebase';
import { getRedisClient } from '../config/redis';
import { syncFirebaseUser, getCurrentUser, logoutUser, handleLoginAttempt, unblockUser, registerUser } from '../services/auth.service';
import { logger } from '../utils/logger';
import { resolveEffectivePermissions } from '../services/permissionsResolver.service';
import { parseId } from '../utils/asyncHandler';
import { validateSetPasswordToken, consumeSetPasswordToken, createOtp, validateOtp, consumeOtp } from '../services/passwordToken.service';
import { emailService } from '../services/email.service';

const REDIS_SESSION_TTL = parseInt(process.env.REDIS_SESSION_TTL || '3600');
const IS_DEV = process.env.NODE_ENV === 'development';

export const syncUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: missing token' });
      return;
    }

    const token = authHeader.substring(7);
    const devSecretHeader = req.headers['x-dev-secret'] as string | undefined;
    const isDevBypass = IS_DEV && process.env.DEV_SECRET && devSecretHeader === process.env.DEV_SECRET;

    // Dev bypass: only in development with matching DEV_SECRET
    if ((!firebaseAuth && IS_DEV && isDevBypass) || isDevBypass) {
      const devEmail = req.headers['x-dev-user-email'] as string | undefined;
      if (!devEmail) {
        res.status(401).json({ error: 'Unauthorized: dev mode requires x-dev-user-email header' });
        return;
      }

      const [dbUser] = await db.select().from(users).where(eq(users.email, devEmail)).limit(1);
      if (!dbUser) {
        res.status(401).json({ error: 'Unauthorized: user not found' });
        return;
      }

      if (dbUser.status === 'locked') {
        res.status(403).json({ error: 'Account locked' });
        return;
      }

      const redis = await getRedisClient();
      const userPayload = {
        id: dbUser.id,
        firebaseUid: dbUser.firebaseUid,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        avatarUrl: dbUser.avatarUrl,
        organizationId: dbUser.organizationId,
        departmentId: dbUser.departmentId,
        status: dbUser.status,
        role: dbUser.role,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt
      };
      await redis.setEx(`token:${token}`, REDIS_SESSION_TTL, JSON.stringify(userPayload));

      res.json(dbUser);
      return;
    }

    if (!firebaseAuth) {
      res.status(500).json({ error: 'Firebase Auth not configured' });
      return;
    }

    const decoded = await firebaseAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email || req.body.email;
    const displayName = decoded.name || '';
    const [firstName, lastName] = displayName
      ? displayName.split(' ')
      : [req.body.firstName, req.body.lastName];

    const user = await syncFirebaseUser(uid, email || '', firstName || 'User', lastName || '');

    // Cache user in Redis so subsequent requests (GET /auth/me) work immediately
    const redis = await getRedisClient();
    const userPayload = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    await redis.setEx(`token:${token}`, REDIS_SESSION_TTL, JSON.stringify(userPayload));

    res.json(user);
  } catch (err: any) {
    logger.error('Sync user error', { error: err });
    res.status(401).json({ error: 'Unauthorized: invalid token' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await getCurrentUser(req.user.id);
    res.json(user);
  } catch (err) {
    logger.error('Get me error', { error: err });
    res.status(500).json({ error: 'Failed to get user' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      await logoutUser(authHeader.substring(7));
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email, roleId } = req.body;
    const orgId = req.user!.organizationId;
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(invitations).values({
      organizationId: orgId,
      email,
      token,
      roleId,
      invitedBy: req.user!.id,
      expiresAt
    });

    res.json({ token, message: 'Invitation created' });
  } catch (err) {
    logger.error('Invite user error', { error: err });
    res.status(500).json({ error: 'Invitation failed' });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { firebaseUid, email, firstName, lastName } = req.body;

    const [inv] = await db.select().from(invitations).where(eq(invitations.token, token)).limit(1);
    if (!inv || inv.status !== 'pending' || new Date() > inv.expiresAt) {
      res.status(400).json({ error: 'Invalid or expired invitation' });
      return;
    }

    const user = await syncFirebaseUser(firebaseUid, email, firstName, lastName);
    if (inv.roleId) {
      await db.insert(userRoles).values({ userId: user.id, roleId: inv.roleId });
    }

    await db.update(invitations).set({ status: 'accepted' }).where(eq(invitations.id, inv.id));
    res.json({ message: 'Invitation accepted' });
  } catch (err) {
    logger.error('Accept invite error', { error: err });
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }
    const user = await registerUser({ email, password, firstName, lastName });
    res.status(201).json({ message: 'User registered', user });
  } catch (err: any) {
    logger.error('Register error', { error: err });
    if (err.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Token and password (min 6 chars) are required' });
      return;
    }

    const payload = await validateSetPasswordToken(token);
    if (!payload) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const { firebaseAuth } = await import('../config/firebase');
    if (firebaseAuth) {
      const [dbUser] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      if (!dbUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      await firebaseAuth.updateUser(dbUser.firebaseUid, { password: newPassword });
    }

    await consumeSetPasswordToken(token);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Set password error', { error: err });
    res.status(500).json({ error: 'Failed to set password' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Always return same response to prevent email enumeration
    if (!dbUser) {
      res.json({ message: 'If this email exists, a reset code has been sent.' });
      return;
    }

    const otp = await createOtp(`reset:${dbUser.id}`);

    // Send via email
    try {
      await emailService.sendPasswordResetOtp(dbUser.email, dbUser.firstName, otp, 'email');
    } catch (err) {
      logger.error('Failed to send password reset email', { error: err, email: dbUser.email });
    }

    // Send via Telegram if linked
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, dbUser.id)).limit(1);
    if (prefs?.telegramChatId) {
      try {
        const { sendViaProvider } = await import('../services/notification.service');
        await sendViaProvider(dbUser.id, 'password.reset.otp', {
          title: 'Code de réinitialisation de mot de passe',
          message: `Votre code de réinitialisation est : ${otp}. Il est valable 2 heures.`,
          telegramChatId: prefs.telegramChatId
        });
      } catch (err) {
        logger.error('Failed to send password reset Telegram', { error: err, userId: dbUser.id });
      }
    }

    res.json({ message: 'If this email exists, a reset code has been sent.' });
  } catch (err) {
    logger.error('Forgot password error', { error: err });
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Email, OTP and password (min 6 chars) are required' });
      return;
    }

    const [dbUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!dbUser) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    const valid = await validateOtp(`reset:${dbUser.id}`, otp);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    const { firebaseAuth } = await import('../config/firebase');
    if (firebaseAuth) {
      await firebaseAuth.updateUser(dbUser.firebaseUid, { password: newPassword });
    }

    await consumeOtp(`reset:${dbUser.id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Reset password error', { error: err });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const unblock = async (req: Request, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, req.user!.organizationId))).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await unblockUser(userId);
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

export const getEffectivePermissions = async (req: Request, res: Response) => {
  try {
    const userId = parseId(req.params.id);
    const [user] = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, req.user!.organizationId))).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const result = await resolveEffectivePermissions(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve permissions' });
  }
};

export const devLogin = async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      res.status(403).json({ error: 'Dev login is only available in development mode' });
      return;
    }

    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = `dev_${user.id}_${Date.now()}`;
    const redis = await getRedisClient();
    const userPayload = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      status: user.status || 'active',
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    await redis.setEx(`token:${token}`, REDIS_SESSION_TTL, JSON.stringify(userPayload));

    res.json({ token, user });
  } catch (err) {
    logger.error('Dev login error', { error: err });
    res.status(500).json({ error: 'Dev login failed' });
  }
};
