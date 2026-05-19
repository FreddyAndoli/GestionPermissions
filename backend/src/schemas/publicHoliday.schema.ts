import { z } from 'zod';

export const createPublicHolidaySchema = z.object({
  name: z.string().min(1).max(255),
  holidayDate: z.string().min(1),
  countryCode: z.string().max(10).optional(),
  isCustom: z.boolean().optional()
});

export const updatePublicHolidaySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  holidayDate: z.string().optional(),
  countryCode: z.string().max(10).optional(),
  isCustom: z.boolean().optional()
});

export type CreatePublicHolidayInput = z.infer<typeof createPublicHolidaySchema>;
export type UpdatePublicHolidayInput = z.infer<typeof updatePublicHolidaySchema>;
