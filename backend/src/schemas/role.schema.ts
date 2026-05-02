import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).default([])
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.number()).optional()
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.number())
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
