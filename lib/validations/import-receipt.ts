import { z } from 'zod';

export const ImportReceiptDetailSchema = z.object({
  partId: z.coerce.number().int().positive('Part is required'),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
  notes: z.string().optional(),
});

export const ImportReceiptSchema = z.object({
  supplierId: z.coerce.number().int().positive('Supplier is required'),
  warehouseId: z.coerce.number().int().positive('Warehouse is required'),
  poNumber: z.string().optional(),
  deliveryNote: z.string().optional(),
  notes: z.string().optional(),
  details: z.array(ImportReceiptDetailSchema)
    .min(1, 'At least one item is required')
    .refine((items) => {
      const partIds = items.map((i) => i.partId);
      return new Set(partIds).size === partIds.length;
    }, {
      message: 'Duplicate parts are not allowed in the same receipt',
    }),
});
