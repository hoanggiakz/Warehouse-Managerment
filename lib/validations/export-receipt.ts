import { z } from 'zod';

export const ExportReceiptDetailSchema = z.object({
  partId: z.coerce.number().int().positive('Vui lòng chọn phụ tùng hợp lệ'),
  quantity: z.coerce.number().int().positive('Số lượng xuất phải lớn hơn 0'),
  unitPrice: z.coerce.number().min(0, 'Đơn giá không được âm'),
  locationPicked: z.string().optional(),
});

export const ExportReceiptSchema = z.object({
  warehouseId: z.coerce.number().int().positive('Vui lòng chọn kho xuất hàng'),
  requestDepartment: z.string().optional(),
  reason: z.string().optional(),
  exportDate: z.string().or(z.date()).optional(),
  details: z.array(ExportReceiptDetailSchema)
    .min(1, 'Phiếu xuất phải có ít nhất một phụ tùng')
    .refine((items) => {
      const partIds = items.map((i) => i.partId);
      return new Set(partIds).size === partIds.length;
    }, {
      message: 'Không thể xuất trùng phụ tùng trong cùng một phiếu',
    }),
});

export type ExportReceiptFormValues = z.infer<typeof ExportReceiptSchema>;
export type ExportReceiptDetailFormValues = z.infer<typeof ExportReceiptDetailSchema>;
