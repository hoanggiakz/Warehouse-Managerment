import * as z from 'zod';

export const InventorySchema = z.object({
  partId: z.coerce.number().int(),
  warehouseId: z.coerce.number().int(),
  quantity: z.coerce.number().int().min(0, "Quantity must be at least 0"),
  minStock: z.coerce.number().int().min(0, "Minimum stock must be at least 0").default(10),
  maxStock: z.coerce.number().int().min(0, "Maximum stock must be at least 0").default(1000),
  location: z.string().max(100).optional().nullable(),
}).refine((data) => data.maxStock >= data.minStock, {
  message: "Maximum stock must be greater than or equal to minimum stock",
  path: ["maxStock"],
});

export type InventoryFormValues = z.infer<typeof InventorySchema>;

export const StockAdjustmentSchema = z.object({
  inventoryId: z.coerce.number().int(),
  adjustmentQuantity: z.coerce.number().int().refine((val) => val !== 0, {
    message: "Adjustment quantity cannot be zero",
  }),
  reason: z.string().min(3, "Reason is required and must be at least 3 characters").max(255),
});

export type StockAdjustmentFormValues = z.infer<typeof StockAdjustmentSchema>;
