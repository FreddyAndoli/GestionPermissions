import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getUserPermissions,
  setUserPermission,
  deleteUserPermission
} from '../controllers/userPermissions.controller';

const router = Router();

router.get('/:userId', authMiddleware, requirePermission('permissions.read'), getUserPermissions);
router.post('/:userId', authMiddleware, requirePermission('permissions.update'), setUserPermission);
router.delete('/:id', authMiddleware, requirePermission('permissions.delete'), deleteUserPermission);

export default router;
