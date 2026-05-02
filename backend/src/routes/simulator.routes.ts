import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/role.middleware';
import { resolveEffectivePermissions } from '../services/permissionsResolver.service';

const router = Router();

router.post('/', authMiddleware, requirePermission('admin.simulate'), async (req, res) => {
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
});

export default router;
