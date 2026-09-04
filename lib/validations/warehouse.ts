import * as z from 'zod';
import { WarehouseStatus } from '@prisma/client';

export const WarehouseSchema = z.object({
  code: z.string().min(2, "Warehouse code must be at least 2 characters").max(20, "Warehouse code must be less than 20 characters").trim(),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").trim(),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  capacity: z.coerce.number().int("Capacity must be a whole number").min(0, "Capacity must be greater than or equal to 0"),
  status: z.nativeEnum(WarehouseStatus).default(WarehouseStatus.ACTIVE),
});

export type WarehouseFormValues = z.infer<typeof WarehouseSchema>;
