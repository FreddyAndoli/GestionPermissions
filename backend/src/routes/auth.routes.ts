import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { syncUser, getMe, logout, inviteUser, acceptInvite, unblock, getEffectivePermissions, devLogin, register, setPassword, forgotPassword, resetPasswordWithOtp } from '../controllers/auth.controller';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/set-password', asyncHandler(setPassword));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPasswordWithOtp));
router.post('/dev-login', asyncHandler(devLogin));
router.post('/sync', asyncHandler(syncUser));
router.get('/me', authMiddleware, asyncHandler(getMe));
router.post('/logout', authMiddleware, asyncHandler(logout));
router.post('/invite', authMiddleware, rateLimitMiddleware, requirePermission('users.create'), asyncHandler(inviteUser));
router.post('/invite/:token/accept', asyncHandler(acceptInvite));
router.post('/users/:id/unblock', authMiddleware, requirePermission('users.update'), asyncHandler(unblock));
router.get('/users/:id/permissions', authMiddleware, requirePermission('users.read'), asyncHandler(getEffectivePermissions));

export default router;
