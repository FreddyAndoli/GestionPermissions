import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { listNotifications, markAsRead, markAllAsRead } from '../services/notifications.service';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const rows = await listNotifications(req.user!.id);
  res.json(rows);
});

router.patch('/:id/read', authMiddleware, async (req, res) => {
  await markAsRead(parseInt(req.params.id));
  res.json({ message: 'Marked as read' });
});

router.patch('/read-all', authMiddleware, async (req, res) => {
  await markAllAsRead(req.user!.id);
  res.json({ message: 'All marked as read' });
});

export default router;
