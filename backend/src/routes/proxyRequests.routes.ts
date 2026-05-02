import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getProxyRequests,
  postProxyRequest,
  confirmProxy,
  approveProxy,
  removeProxyRequest
} from '../controllers/proxyRequests.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('permissions.read'), getProxyRequests);
router.post('/', authMiddleware, requirePermission('permissions.create'), postProxyRequest);
router.put('/:id/confirm', authMiddleware, confirmProxy);
router.put('/:id/approve', authMiddleware, requirePermission('permissions.update'), approveProxy);
router.delete('/:id', authMiddleware, requirePermission('permissions.delete'), removeProxyRequest);

export default router;
