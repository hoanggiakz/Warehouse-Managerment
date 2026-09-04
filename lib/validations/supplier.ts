import { z } from 'zod';

export const SupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(100),
  contactName: z.string().max(100).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email address').max(100).optional().nullable().or(z.literal('')),
  address: z.string().max(255).optional().nullable(),
  taxCode: z.string().max(50).optional().nullable(),
  bankAccount: z.string().max(100).optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type SupplierInput = z.infer<typeof SupplierSchema>;
