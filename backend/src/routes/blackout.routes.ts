import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getBlackoutPeriods,
  createBlackout,
  updateBlackout,
  removeBlackout
} from '../controllers/blackout.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), getBlackoutPeriods);
router.post('/', authMiddleware, requirePermission('leaves.approve'), createBlackout);
router.put('/:id', authMiddleware, requirePermission('leaves.approve'), updateBlackout);
router.delete('/:id', authMiddleware, requirePermission('leaves.approve'), removeBlackout);

export default router;
