import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { getUsers, getUser, createNewUser, updateUserById, deactivateUser, exportUsersCSV, bulkCreateUsersController, updateUserRolesController, resetPasswordController } from '../controllers/users.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authMiddleware, requirePermission('users.read'), getUsers);
router.get('/export/csv', authMiddleware, requirePermission('users.read'), exportUsersCSV);
router.post('/', authMiddleware, rateLimitMiddleware, requirePermission('users.create'), createNewUser);
router.get('/:id', authMiddleware, requirePermission('users.read'), getUser);
router.put('/:id', authMiddleware, requirePermission('users.update'), updateUserById);
router.delete('/:id', authMiddleware, requirePermission('users.delete'), deactivateUser);

// Sessions
router.post('/bulk', authMiddleware, requirePermission('users.create'), bulkCreateUsersController);

router.put('/:id/roles', authMiddleware, requirePermission('users.update'), updateUserRolesController);
router.post('/:id/reset-password', authMiddleware, requirePermission('users.update'), resetPasswordController);

router.get('/:id/sessions', authMiddleware, requirePermission('users.read'), asyncHandler(async (_req, res) => {
  res.json({ sessions: [] });
}));
router.delete('/:id/sessions', authMiddleware, requirePermission('users.update'), asyncHandler(async (_req, res) => {
  res.json({ message: 'Sessions revoked' });
}));

export default router;
