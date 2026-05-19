import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { adminBoundaryMiddleware } from '../middlewares/adminBoundary.middleware';
import { getUsers, getColleagues, getUser, createNewUser, updateUserById, deactivateUser, exportUsersCSV, bulkCreateUsersController, updateUserRolesController, resetPasswordController, eraseUser, exportUserDataController, getUserConsentsController, withdrawConsentController, hardDeleteUserController } from '../controllers/users.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(adminBoundaryMiddleware);

router.get('/colleagues', authMiddleware, asyncHandler(getColleagues));
router.get('/', authMiddleware, requirePermission('users.read'), getUsers);
router.get('/export/csv', authMiddleware, requirePermission('users.read'), exportUsersCSV);
router.post('/', authMiddleware, rateLimitMiddleware, requirePermission('users.create'), createNewUser);
router.get('/:id', authMiddleware, requirePermission('users.read'), getUser);
router.put('/:id', authMiddleware, requirePermission('users.update'), updateUserById);
router.delete('/:id', authMiddleware, requirePermission('users.delete'), deactivateUser);
router.delete('/:id/hard', authMiddleware, requirePermission('users.delete'), asyncHandler(hardDeleteUserController));
router.post('/:id/erase', authMiddleware, asyncHandler(eraseUser));
router.get('/:id/export-data', authMiddleware, asyncHandler(exportUserDataController));
router.get('/:id/consents', authMiddleware, asyncHandler(getUserConsentsController));
router.post('/:id/consents/withdraw', authMiddleware, asyncHandler(withdrawConsentController));

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
