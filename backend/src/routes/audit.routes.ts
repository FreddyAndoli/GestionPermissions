import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { getAuditLogs, exportAuditCSV } from '../controllers/audit.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('audit.read'), getAuditLogs);
router.get('/export/csv', authMiddleware, requirePermission('audit.read'), exportAuditCSV);

export default router;
