import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { getAnnouncements, postAnnouncement, dismissAnnouncementController } from '../controllers/announcements.controller';

const router = Router();

router.get('/', authMiddleware, asyncHandler(getAnnouncements));
router.post('/', authMiddleware, requirePermission('admin.read'), asyncHandler(postAnnouncement));
router.patch('/:id/dismiss', authMiddleware, asyncHandler(dismissAnnouncementController));

export default router;
