import { z } from 'zod';

export const createProxyRequestSchema = z.object({
  beneficiaryUserId: z.number(),
  permissionId: z.number(),
  reason: z.string().optional()
});

export const confirmProxyRequestSchema = z.object({
  status: z.enum(['confirmed', 'rejected'])
});

export type CreateProxyRequestInput = z.infer<typeof createProxyRequestSchema>;
export type ConfirmProxyRequestInput = z.infer<typeof confirmProxyRequestSchema>;
