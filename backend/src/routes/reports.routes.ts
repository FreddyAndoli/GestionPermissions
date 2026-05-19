import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { generateReport, downloadReport, getAnomalies } from '../controllers/reports.controller';

const router = Router();

router.post('/generate', authMiddleware, requirePermission('reports.export'), asyncHandler(generateReport));
router.get('/:reportId', authMiddleware, asyncHandler(downloadReport));
router.get('/anomalies', authMiddleware, requirePermission('admin.read'), asyncHandler(getAnomalies));

export default router;
