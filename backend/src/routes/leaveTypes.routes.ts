import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { db } from '../config/db';
import { leaveTypes } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const rows = await db.select().from(leaveTypes).where(eq(leaveTypes.organizationId, req.user!.organizationId));
  res.json(rows);
});

router.post('/', authMiddleware, requirePermission('leave_types.create'), async (req: Request, res: Response) => {
  const [result] = await db.insert(leaveTypes).values({ ...req.body, organizationId: req.user!.organizationId });
  const [row] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, result.insertId)).limit(1);
  res.status(201).json(row);
});

router.put('/:id', authMiddleware, requirePermission('leave_types.update'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.update(leaveTypes).set(req.body).where(eq(leaveTypes.id, id));
  const [row] = await db.select().from(leaveTypes).where(eq(leaveTypes.id, id)).limit(1);
  res.json(row);
});

router.delete('/:id', authMiddleware, requirePermission('leave_types.delete'), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(leaveTypes).where(eq(leaveTypes.id, id));
  res.json({ message: 'Leave type deleted' });
});

export default router;
