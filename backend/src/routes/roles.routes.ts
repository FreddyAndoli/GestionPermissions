import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getRoles, getRole, createNewRole, updateRoleById, removeRole, getPermissions } from '../controllers/roles.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('roles.read'), asyncHandler(getRoles));
router.post('/', authMiddleware, rateLimitMiddleware, requirePermission('roles.create'), asyncHandler(createNewRole));
router.get('/:id', authMiddleware, requirePermission('roles.read'), asyncHandler(getRole));
router.put('/:id', authMiddleware, requirePermission('roles.update'), asyncHandler(updateRoleById));
router.delete('/:id', authMiddleware, requirePermission('roles.delete'), asyncHandler(removeRole));
router.put('/:id/permissions', authMiddleware, requirePermission('roles.update'), asyncHandler(updateRoleById));

export default router;
