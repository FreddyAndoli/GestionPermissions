import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { syncUser, getMe, logout, inviteUser, acceptInvite, unblock, getEffectivePermissions, devLogin, register } from '../controllers/auth.controller';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.post('/register', register);
router.post('/dev-login', devLogin);
router.post('/sync', syncUser);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
router.post('/invite', authMiddleware, rateLimitMiddleware, requirePermission('users.create'), inviteUser);
router.post('/invite/:token/accept', acceptInvite);
router.post('/users/:id/unblock', authMiddleware, requirePermission('users.update'), unblock);
router.get('/users/:id/permissions', authMiddleware, requirePermission('users.read'), getEffectivePermissions);

export default router;
