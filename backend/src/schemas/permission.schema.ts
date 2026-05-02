import { z } from 'zod';

export const createPermissionSchema = z.object({
  moduleId: z.number(),
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  action: z.enum(['create', 'read', 'update', 'delete', 'approve', 'export', 'simulate']),
  description: z.string().optional()
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional()
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
