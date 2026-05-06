import { z } from 'zod';

export const createBlackoutSchema = z.object({
  departmentId: z.number().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  message: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional()
});

export const updateBlackoutSchema = z.object({
  departmentId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  message: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional()
});

export type CreateBlackoutInput = z.infer<typeof createBlackoutSchema>;
export type UpdateBlackoutInput = z.infer<typeof updateBlackoutSchema>;
