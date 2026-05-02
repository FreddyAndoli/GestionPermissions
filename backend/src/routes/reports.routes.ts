import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { generateReport, downloadReport, getAnomalies } from '../controllers/reports.controller';

const router = Router();

router.post('/generate', authMiddleware, requirePermission('reports.export'), generateReport);
router.get('/:reportId', authMiddleware, downloadReport);
router.get('/anomalies', authMiddleware, requirePermission('admin.read'), getAnomalies);

export default router;
