import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getPublicHolidays,
  createHoliday,
  updateHoliday,
  removeHoliday
} from '../controllers/publicHolidays.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), asyncHandler(getPublicHolidays));
router.post('/', authMiddleware, requirePermission('admin.write'), asyncHandler(createHoliday));
router.put('/:id', authMiddleware, requirePermission('admin.write'), asyncHandler(updateHoliday));
router.delete('/:id', authMiddleware, requirePermission('admin.write'), asyncHandler(removeHoliday));

export default router;
