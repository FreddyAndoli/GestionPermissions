import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { resolveEffectivePermissions } from '../services/permissionsResolver.service';
import { asyncHandler } from '../utils/asyncHandler';
import { db } from '../config/db';
import { users, permissions, organizations } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

router.post('/', authMiddleware, requirePermission('admin.simulate'), asyncHandler(async (req, res) => {
  const { userId, permissionSlug } = req.body;
  const result = await resolveEffectivePermissions(userId);
  const target = result.resolutionChain.find(r => r.permissionSlug === permissionSlug);

  res.json({
    userId,
    permissionSlug,
    granted: result.permissions[permissionSlug] || false,
    resolution: target || null,
    fullChain: result.resolutionChain
  });
}));

router.get('/matrix', authMiddleware, requirePermission('admin.simulate'), asyncHandler(async (_req, res) => {
  const [org] = await db.select().from(organizations).orderBy(organizations.id).limit(1);
  if (!org) {
    return res.json({ users: [], permissions: [], matrix: {} });
  }

  const allUsers = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.organizationId, org.id))
    .limit(200);

  const allPerms = await db
    .select({ id: permissions.id, slug: permissions.slug, name: permissions.name, action: permissions.action })
    .from(permissions)
    .orderBy(permissions.slug)
    .limit(500);

  const matrix: Record<number, Record<string, { granted: boolean; source: string }>> = {};

  for (const u of allUsers) {
    const effective = await resolveEffectivePermissions(u.id);
    matrix[u.id] = {};
    for (const p of allPerms) {
      const entry = effective.resolutionChain.find((r) => r.permissionSlug === p.slug);
      matrix[u.id][p.slug] = {
        granted: effective.permissions[p.slug] || false,
        source: entry?.source || 'none'
      };
    }
  }

  res.json({ users: allUsers, permissions: allPerms, matrix });
}));

export default router;
