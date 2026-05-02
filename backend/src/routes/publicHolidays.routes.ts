import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getPublicHolidays,
  createHoliday,
  updateHoliday,
  removeHoliday
} from '../controllers/publicHolidays.controller';

const router = Router();

router.get('/', authMiddleware, requirePermission('leaves.read'), getPublicHolidays);
router.post('/', authMiddleware, requirePermission('admin.write'), createHoliday);
router.put('/:id', authMiddleware, requirePermission('admin.write'), updateHoliday);
router.delete('/:id', authMiddleware, requirePermission('admin.write'), removeHoliday);

export default router;
