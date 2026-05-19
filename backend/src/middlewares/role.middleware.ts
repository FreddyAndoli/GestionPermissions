import { Request, Response, NextFunction } from 'express';
import { resolveEffectivePermissions } from '../services/permissionsResolver.service';
import { db } from '../config/db';
import { userRoles, roles } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const requirePermission = (permissionSlug: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { permissions } = await resolveEffectivePermissions(req.user.id);

      // Admin bypass: check if user has the Super Admin role via user_roles
      const [superAdminRole] = await db.select().from(roles).where(eq(roles.name, 'Super Admin')).limit(1);
      let isSuperAdmin = false;
      if (superAdminRole) {
        const [adminRoleAssignment] = await db
          .select()
          .from(userRoles)
          .where(and(eq(userRoles.userId, req.user.id), eq(userRoles.roleId, superAdminRole.id)))
          .limit(1);
        isSuperAdmin = !!adminRoleAssignment;
      }

      if (isSuperAdmin || permissions['admin.read']) {
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
