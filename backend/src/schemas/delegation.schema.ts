import { z } from 'zod';

export const createDelegationSchema = z.object({
  managerId: z.number(),
  delegateId: z.number(),
  startDate: z.string().min(1),
  endDate: z.string().min(1)
});

export const updateDelegationSchema = z.object({
  delegateId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type UpdateDelegationInput = z.infer<typeof updateDelegationSchema>;
