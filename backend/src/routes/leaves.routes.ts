import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import {
  getLeaves, getLeave, createLeave, approve, reject,
  directorApprove, directorReject, teamCalendar, balance,
  exportLeavesCSV, leaveCommentsList, leaveHistory, myLeaves
} from '../controllers/leaves.controller';

const router = Router();

router.get('/me', authMiddleware, myLeaves);
router.get('/', authMiddleware, requirePermission('leaves.read'), getLeaves);
router.get('/export/csv', authMiddleware, requirePermission('leaves.read'), exportLeavesCSV);
router.post('/', authMiddleware, requirePermission('leaves.create'), createLeave);
router.get('/team-calendar', authMiddleware, requirePermission('leaves.read'), teamCalendar);
router.get('/balance', authMiddleware, balance);
router.get('/:id', authMiddleware, requirePermission('leaves.read'), getLeave);
router.patch('/:id/approve', authMiddleware, requirePermission('leaves.approve'), approve);
router.patch('/:id/reject', authMiddleware, requirePermission('leaves.approve'), reject);
router.patch('/:id/director-approve', authMiddleware, requirePermission('leaves.approve'), directorApprove);
router.patch('/:id/director-reject', authMiddleware, requirePermission('leaves.approve'), directorReject);
router.get('/:id/comments', authMiddleware, requirePermission('leaves.read'), leaveCommentsList);
router.get('/:id/history', authMiddleware, requirePermission('leaves.read'), leaveHistory);

export default router;
