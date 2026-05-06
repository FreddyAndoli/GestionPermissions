import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getLeaves, getLeave, createLeave, approve, reject,
  directorApprove, directorReject, teamCalendar, balance,
  exportLeavesCSV, leaveCommentsList, leaveHistory, myLeaves
} from '../controllers/leaves.controller';

const router = Router();

router.get('/me', authMiddleware, asyncHandler(myLeaves));
router.get('/', authMiddleware, requirePermission('leaves.read'), asyncHandler(getLeaves));
router.get('/export/csv', authMiddleware, requirePermission('leaves.read'), asyncHandler(exportLeavesCSV));
router.post('/', authMiddleware, requirePermission('leaves.create'), asyncHandler(createLeave));
router.get('/team-calendar', authMiddleware, requirePermission('leaves.read'), asyncHandler(teamCalendar));
router.get('/balance', authMiddleware, asyncHandler(balance));
router.get('/:id', authMiddleware, requirePermission('leaves.read'), asyncHandler(getLeave));
router.patch('/:id/approve', authMiddleware, requirePermission('leaves.approve'), asyncHandler(approve));
router.patch('/:id/reject', authMiddleware, requirePermission('leaves.approve'), asyncHandler(reject));
router.patch('/:id/director-approve', authMiddleware, requirePermission('leaves.approve'), asyncHandler(directorApprove));
router.patch('/:id/director-reject', authMiddleware, requirePermission('leaves.approve'), asyncHandler(directorReject));
router.get('/:id/comments', authMiddleware, requirePermission('leaves.read'), asyncHandler(leaveCommentsList));
router.get('/:id/history', authMiddleware, requirePermission('leaves.read'), asyncHandler(leaveHistory));

export default router;
