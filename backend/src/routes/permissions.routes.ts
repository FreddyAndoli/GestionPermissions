import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getPermissions } from '../controllers/roles.controller';

const router = Router();
router.get('/', authMiddleware, requirePermission('permissions.read'), asyncHandler(getPermissions));
router.get('/public', authMiddleware, asyncHandler(getPermissions));
export default router;
