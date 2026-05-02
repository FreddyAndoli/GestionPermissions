import { Request, Response, NextFunction } from 'express';
import { resolveEffectivePermissions } from '../services/permissionsResolver.service';

export const requirePermission = (permissionSlug: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { permissions } = await resolveEffectivePermissions(req.user.id);

      // Admin bypass
      if (req.user.role === 'Super Admin' || permissions['admin.read']) {
        next();
        return;
      }

      if (!permissions[permissionSlug]) {
        res.status(403).json({ error: 'Forbidden: insufficient permissions' });
        return;
      }

      next();
    } catch (err) {
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};
