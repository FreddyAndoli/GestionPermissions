import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.number(),
  periods: z.array(z.object({
    startDate: z.string(),
    endDate: z.string()
  })).min(1),
  reason: z.string().optional(),
  replacementUserId: z.number().optional(),
  isProxyRequest: z.boolean().default(false)
});

export const approveLeaveSchema = z.object({
  comment: z.string().optional()
});

export const createLeaveTypeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  defaultQuota: z.number().default(0),
  validationMode: z.enum(['manager', 'auto_approved', 'free']).default('manager'),
  isCumulative: z.boolean().default(false),
  carryOverLimit: z.number().default(0),
  deductibleQuota: z.boolean().default(true),
  color: z.string().default('#22C55E')
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
