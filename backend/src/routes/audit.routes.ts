import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getAuditLogs, exportAuditCSV } from '../controllers/audit.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('audit.read'), asyncHandler(getAuditLogs));
router.get('/export/csv', authMiddleware, requirePermission('audit.read'), asyncHandler(exportAuditCSV));

export default router;
