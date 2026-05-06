import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getProxyRequests,
  postProxyRequest,
  confirmProxy,
  approveProxy,
  removeProxyRequest
} from '../controllers/proxyRequests.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('permissions.read'), asyncHandler(getProxyRequests));
router.post('/', authMiddleware, requirePermission('permissions.create'), asyncHandler(postProxyRequest));
router.put('/:id/confirm', authMiddleware, asyncHandler(confirmProxy));
router.put('/:id/approve', authMiddleware, requirePermission('permissions.update'), asyncHandler(approveProxy));
router.delete('/:id', authMiddleware, requirePermission('permissions.delete'), asyncHandler(removeProxyRequest));

export default router;
