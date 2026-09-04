import { z } from 'zod';

export const AuditLogFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional().default(''),
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditLogFilterInput = z.infer<typeof AuditLogFilterSchema>;
