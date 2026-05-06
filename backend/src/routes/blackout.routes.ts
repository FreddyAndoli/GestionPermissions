import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getBlackoutPeriods,
  createBlackout,
  updateBlackout,
  removeBlackout
} from '../controllers/blackout.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), asyncHandler(getBlackoutPeriods));
router.post('/', authMiddleware, requirePermission('leaves.approve'), asyncHandler(createBlackout));
router.put('/:id', authMiddleware, requirePermission('leaves.approve'), asyncHandler(updateBlackout));
router.delete('/:id', authMiddleware, requirePermission('leaves.approve'), asyncHandler(removeBlackout));

export default router;
