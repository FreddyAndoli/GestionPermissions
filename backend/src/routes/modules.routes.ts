import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { db } from '../config/db';
import { modules } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', authMiddleware, requirePermission('permissions.read'), asyncHandler(async (req: Request, res: Response) => {
  const rows = await db.select().from(modules).where(eq(modules.organizationId, req.user!.organizationId));
  res.json(rows);
}));

router.post('/', authMiddleware, requirePermission('permissions.create'), asyncHandler(async (req: Request, res: Response) => {
  const [result] = await db.insert(modules).values({ ...req.body, organizationId: req.user!.organizationId });
  const [row] = await db.select().from(modules).where(eq(modules.id, result.insertId)).limit(1);
  res.status(201).json(row);
}));

router.put('/:id', authMiddleware, requirePermission('permissions.update'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.update(modules).set(req.body).where(eq(modules.id, id));
  const [row] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  res.json(row);
}));

router.delete('/:id', authMiddleware, requirePermission('permissions.delete'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  await db.delete(modules).where(eq(modules.id, id));
  res.json({ message: 'Module deleted' });
}));

router.patch('/:id/toggle', authMiddleware, requirePermission('permissions.update'), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const [mod] = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  if (!mod) { res.status(404).json({ error: 'Not found' }); return; }
  await db.update(modules).set({ isActive: !mod.isActive }).where(eq(modules.id, id));
  res.json({ isActive: !mod.isActive });
}));

export default router;
