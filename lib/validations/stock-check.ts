import { z } from 'zod';

export const CreateStockCheckSchema = z.object({
  warehouseId: z.coerce.number().int().positive('Vui lòng chọn kho kiểm kê hợp lệ'),
  checkDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
  partIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const UpdateStockCheckSchema = z.object({
  checkDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
});

export const RecordCountItemSchema = z.object({
  detailId: z.coerce.number().int().positive('Chi tiết kiểm kê không hợp lệ'),
  actualQty: z.coerce.number().int().min(0, 'Số lượng thực tế không được âm'),
  notes: z.string().optional(),
});

export const RecordStockCountSchema = z.object({
  stockCheckId: z.coerce.number().int().positive('Mã phiếu kiểm kê không hợp lệ'),
  counts: z.array(RecordCountItemSchema).min(1, 'Cần có ít nhất một bản ghi số lượng thực tế'),
});

export const AdjustStockCheckSchema = z.object({
  stockCheckId: z.coerce.number().int().positive('Mã phiếu kiểm kê không hợp lệ'),
  notes: z.string().optional(),
  itemIds: z.array(z.coerce.number().int().positive()).optional(),
});

export type CreateStockCheckInput = z.infer<typeof CreateStockCheckSchema>;
export type UpdateStockCheckInput = z.infer<typeof UpdateStockCheckSchema>;
export type RecordCountItemInput = z.infer<typeof RecordCountItemSchema>;
export type RecordStockCountInput = z.infer<typeof RecordStockCountSchema>;
export type AdjustStockCheckInput = z.infer<typeof AdjustStockCheckSchema>;
