import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { getRoles, getRole, createNewRole, updateRoleById, removeRole, getPermissions } from '../controllers/roles.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('roles.read'), getRoles);
router.post('/', authMiddleware, rateLimitMiddleware, requirePermission('roles.create'), createNewRole);
router.get('/:id', authMiddleware, requirePermission('roles.read'), getRole);
router.put('/:id', authMiddleware, requirePermission('roles.update'), updateRoleById);
router.delete('/:id', authMiddleware, requirePermission('roles.delete'), removeRole);
router.put('/:id/permissions', authMiddleware, requirePermission('roles.update'), updateRoleById);

export default router;
