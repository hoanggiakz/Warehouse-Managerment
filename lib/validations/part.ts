import { z } from 'zod';

export const WheelSpecificationSchema = z.object({
  size: z.coerce.number().positive(),
  width: z.coerce.number().positive(),
  pcd: z.string().min(1),
  et: z.coerce.number(),
  holes: z.coerce.number().int().positive(),
  material: z.string().min(1),
});

export const TireSpecificationSchema = z.object({
  width: z.coerce.number().positive(),
  aspectRatio: z.coerce.number().positive(),
  diameter: z.coerce.number().positive(),
  loadIndex: z.coerce.number().positive(),
  speedRating: z.string().min(1),
  dot: z.string().optional(),
});

export const AccessorySpecificationSchema = z.object({
  type: z.string().min(1),
  compatibleModels: z.array(z.string()).optional(),
}).catchall(z.any());

export const PartSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  categoryId: z.coerce.number().int().positive(),
  brand: z.string().min(1, 'Brand is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(50),
  purchasePrice: z.coerce.number().min(0, 'Purchase price must be positive'),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  supplierId: z.coerce.number().int().positive(),
  specifications: z.any(), // Will be dynamically validated based on category
  imageUrl: z.string().optional().nullable(),
  minStock: z.coerce.number().int().min(0, 'Min stock must be >= 0'),
  maxStock: z.coerce.number().int().min(0, 'Max stock must be >= 0'),
  locationDefault: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISCONTINUED']).default('ACTIVE'),
}).refine((data) => data.maxStock >= data.minStock, {
  message: "Max stock must be greater than or equal to min stock",
  path: ["maxStock"],
});

export type PartInput = z.infer<typeof PartSchema>;
export type WheelSpec = z.infer<typeof WheelSpecificationSchema>;
export type TireSpec = z.infer<typeof TireSpecificationSchema>;
