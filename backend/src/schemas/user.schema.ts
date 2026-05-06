import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  phoneNumber: z.string().max(30).optional(),
  password: z.string().min(6).optional(),
  departmentId: z.number().optional(),
  roleIds: z.array(z.number()).optional()
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().max(30).optional(),
  departmentId: z.number().nullable().optional(),
  status: z.enum(['active', 'inactive', 'locked', 'pending', 'suspended']).optional()
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.number().optional()
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6)
});

export const bulkCreateUsersSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    phoneNumber: z.string().max(30).optional(),
    password: z.string().min(6).optional(),
    roleIds: z.array(z.number()).optional(),
    departmentId: z.number().optional()
  })).min(1).max(100)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
