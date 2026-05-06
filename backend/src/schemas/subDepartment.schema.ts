import { z } from 'zod';

export const createSubDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  departmentId: z.number(),
  managerId: z.number().optional()
});

export const updateSubDepartmentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  departmentId: z.number().optional(),
  managerId: z.number().nullable().optional()
});

export const addMembersSchema = z.object({
  userIds: z.array(z.number()).min(1)
});

export type CreateSubDepartmentInput = z.infer<typeof createSubDepartmentSchema>;
export type UpdateSubDepartmentInput = z.infer<typeof updateSubDepartmentSchema>;
