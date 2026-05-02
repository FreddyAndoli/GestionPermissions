import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { db } from '../config/db';
import { announcements, announcementDismissals } from '../db/schema';
import { eq, and, gte, or, isNull } from 'drizzle-orm';
import { Request, Response } from 'express';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const now = new Date();
  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.organizationId, req.user!.organizationId),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
      )
    );

  // Filter out dismissed
  const dismissals = await db
    .select()
    .from(announcementDismissals)
    .where(eq(announcementDismissals.userId, req.user!.id));
  const dismissedIds = new Set(dismissals.map(d => d.announcementId));

  res.json(rows.filter(r => !dismissedIds.has(r.id) || !r.isDismissible));
});

router.post('/', authMiddleware, requirePermission('admin.read'), async (req: Request, res: Response) => {
  const [result] = await db.insert(announcements).values({
    ...req.body,
    organizationId: req.user!.organizationId,
    authorId: req.user!.id
  });
  const [row] = await db.select().from(announcements).where(eq(announcements.id, result.insertId)).limit(1);
  res.status(201).json(row);
});

router.patch('/:id/dismiss', authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.insert(announcementDismissals).values({
    announcementId: id,
    userId: req.user!.id
  });
  res.json({ message: 'Dismissed' });
});

export default router;
