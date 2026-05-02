import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { getPermissions } from '../controllers/roles.controller';

const router = Router();
router.get('/', authMiddleware, requirePermission('permissions.read'), getPermissions);
export default router;
