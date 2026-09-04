import { z } from 'zod';

export const DEFECT_CATEGORIES = [
  'DIMENSIONAL',
  'MATERIAL',
  'SURFACE',
  'FUNCTIONAL',
  'ASSEMBLY',
  'ELECTRICAL',
  'PACKAGING',
  'DOCUMENTATION',
  'OTHER',
] as const;

export const DEFECT_SEVERITIES = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
  'MINOR',
  'MODERATE',
  'MAJOR',
] as const;

export const DISPOSITION_ACTIONS = [
  'ACCEPT',
  'REWORK',
  'REINSPECT',
  'QUARANTINE',
  'REJECT',
  'RETURN_TO_SUPPLIER',
  'RETURN',
  'RECYCLE',
  'DISPOSE',
  'REPAIR',
] as const;

export const CreateQualityCheckSchema = z
  .object({
    partId: z.coerce.number().int().positive('Vui lòng chọn phụ tùng kiểm tra hợp lệ'),
    warehouseId: z.coerce.number().int().positive('Kho hàng không hợp lệ').optional().nullable(),
    importId: z.coerce.number().int().positive('Phiếu nhập không hợp lệ').optional().nullable(),
    checkDate: z.string().or(z.date()).optional(),
    quantityChecked: z.coerce
      .number()
      .int('Số lượng kiểm tra phải là số nguyên')
      .positive('Số lượng kiểm tra phải lớn hơn 0 (BR-31)'),
    quantityPassed: z.coerce
      .number()
      .int('Số lượng đạt phải là số nguyên')
      .min(0, 'Số lượng đạt không được âm (BR-33)'),
    quantityFailed: z.coerce
      .number()
      .int('Số lượng lỗi phải là số nguyên')
      .min(0, 'Số lượng lỗi không được âm (BR-33)'),
    failureType: z.string().optional().nullable(),
    failureDescription: z.string().optional().nullable(),
    severity: z.enum(DEFECT_SEVERITIES).optional().default('MINOR'),
    action: z.enum(DISPOSITION_ACTIONS).optional().default('ACCEPT'),
  })
  .superRefine((data, ctx) => {
    // BR-32: Consistency check: quantityPassed + quantityFailed === quantityChecked
    if (data.quantityPassed + data.quantityFailed !== data.quantityChecked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tổng số lượng đạt (${data.quantityPassed}) và số lượng lỗi (${data.quantityFailed}) phải bằng số lượng kiểm tra (${data.quantityChecked}) (BR-32)`,
        path: ['quantityPassed'],
      });
    }

    // BR-34: If defectiveQty > 0, defect classification, severity and description are required
    if (data.quantityFailed > 0) {
      if (!data.failureType || data.failureType.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Loại lỗi là bắt buộc khi có phụ tùng không đạt (BR-34)',
          path: ['failureType'],
        });
      }

      if (!data.failureDescription || data.failureDescription.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mô tả chi tiết lỗi là bắt buộc khi có phụ tùng không đạt (BR-34)',
          path: ['failureDescription'],
        });
      }
    }
  });

export const UpdateQualityCheckSchema = z
  .object({
    warehouseId: z.coerce.number().int().positive().optional().nullable(),
    checkDate: z.string().or(z.date()).optional(),
    quantityChecked: z.coerce.number().int().positive('Số lượng kiểm tra phải lớn hơn 0 (BR-31)'),
    quantityPassed: z.coerce.number().int().min(0, 'Số lượng đạt không được âm (BR-33)'),
    quantityFailed: z.coerce.number().int().min(0, 'Số lượng lỗi không được âm (BR-33)'),
    failureType: z.string().optional().nullable(),
    failureDescription: z.string().optional().nullable(),
    severity: z.enum(DEFECT_SEVERITIES).optional(),
    action: z.enum(DISPOSITION_ACTIONS).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.quantityPassed + data.quantityFailed !== data.quantityChecked) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tổng số lượng đạt (${data.quantityPassed}) và lỗi (${data.quantityFailed}) phải bằng số lượng kiểm tra (${data.quantityChecked})`,
        path: ['quantityPassed'],
      });
    }

    if (data.quantityFailed > 0) {
      if (!data.failureType || data.failureType.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Loại lỗi là bắt buộc khi có phụ tùng không đạt (BR-34)',
          path: ['failureType'],
        });
      }
      if (!data.failureDescription || data.failureDescription.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mô tả chi tiết lỗi là bắt buộc khi có phụ tùng không đạt (BR-34)',
          path: ['failureDescription'],
        });
      }
    }
  });

export const AdjustQualityDispositionSchema = z.object({
  qualityCheckId: z.coerce.number().int().positive('Mã phiếu kiểm tra không hợp lệ'),
  action: z.enum(DISPOSITION_ACTIONS).optional(),
  dispositionNotes: z.string().optional(),
});

export type CreateQualityCheckInput = z.infer<typeof CreateQualityCheckSchema>;
export type UpdateQualityCheckInput = z.infer<typeof UpdateQualityCheckSchema>;
export type AdjustQualityDispositionInput = z.infer<typeof AdjustQualityDispositionSchema>;
