import { z } from 'zod';

export const createProxyRequestSchema = z.object({
  beneficiaryUserId: z.number().int().positive(),
  permissionId: z.number().int().positive(),
  reason: z.string().max(2000).optional(),
  attachmentUrl: z.string().max(500).optional(),
  attachmentName: z.string().max(255).optional(),
  attachmentMimeType: z.string().max(100).optional()
});

export const confirmProxyRequestSchema = z.object({
  status: z.enum(['confirmed', 'rejected'])
});

export type CreateProxyRequestInput = z.infer<typeof createProxyRequestSchema>;
export type ConfirmProxyRequestInput = z.infer<typeof confirmProxyRequestSchema>;
