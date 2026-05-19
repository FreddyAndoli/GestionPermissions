import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getUserPermissions,
  setUserPermission,
  deleteUserPermission
} from '../controllers/userPermissions.controller';

const router = Router();

router.get('/:userId', authMiddleware, requirePermission('permissions.read'), asyncHandler(getUserPermissions));
router.post('/:userId', authMiddleware, requirePermission('permissions.update'), asyncHandler(setUserPermission));
router.delete('/:id', authMiddleware, requirePermission('permissions.delete'), asyncHandler(deleteUserPermission));

export default router;
