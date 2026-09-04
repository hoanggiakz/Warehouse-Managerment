import { z } from 'zod';
import {
  startOfDay,
  startOfTomorrow,
  startOfYesterday,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  addYears,
  addMonths,
  parseISO,
  isValid,
  format,
} from 'date-fns';

export const DateRangePresetEnum = z.enum([
  'today',
  'yesterday',
  '7days',
  '30days',
  'this_month',
  'last_month',
  'this_year',
  'custom',
]);

export type DateRangePreset = z.infer<typeof DateRangePresetEnum>;

export const ReportFilterSchema = z.object({
  datePreset: DateRangePresetEnum.optional().default('30days'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  supplierId: z.coerce.number().int().positive().optional(),
  partId: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export type ReportFilterInput = z.input<typeof ReportFilterSchema>;
export type ReportFilterParams = z.infer<typeof ReportFilterSchema>;

export interface ResolvedDateRange {
  startDate: Date;
  endExclusiveDate: Date;
  label: string;
}

/**
 * Resolves standard date presets or custom range into deterministic [startDate, endExclusiveDate] boundaries.
 * Using 'lt' on endExclusiveDate prevents timezone boundary collision.
 */
export function resolveDateRange(
  preset: DateRangePreset = '30days',
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): ResolvedDateRange {
  const now = referenceDate;

  switch (preset) {
    case 'today': {
      const start = startOfDay(now);
      const end = startOfTomorrow();
      return { startDate: start, endExclusiveDate: end, label: 'Today' };
    }
    case 'yesterday': {
      const start = startOfYesterday();
      const end = startOfDay(now);
      return { startDate: start, endExclusiveDate: end, label: 'Yesterday' };
    }
    case '7days': {
      const start = subDays(startOfDay(now), 6);
      const end = startOfTomorrow();
      return { startDate: start, endExclusiveDate: end, label: 'Last 7 Days' };
    }
    case '30days': {
      const start = subDays(startOfDay(now), 29);
      const end = startOfTomorrow();
      return { startDate: start, endExclusiveDate: end, label: 'Last 30 Days' };
    }
    case 'this_month': {
      const start = startOfMonth(now);
      const end = addMonths(start, 1);
      return { startDate: start, endExclusiveDate: end, label: 'Current Month' };
    }
    case 'last_month': {
      const start = startOfMonth(subMonths(now, 1));
      const end = startOfMonth(now);
      return { startDate: start, endExclusiveDate: end, label: 'Previous Month' };
    }
    case 'this_year': {
      const start = startOfYear(now);
      const end = addYears(start, 1);
      return { startDate: start, endExclusiveDate: end, label: 'Current Year' };
    }
    case 'custom': {
      let start: Date;
      let end: Date;

      if (customStart && isValid(parseISO(customStart))) {
        start = startOfDay(parseISO(customStart));
      } else {
        start = subDays(startOfDay(now), 29);
      }

      if (customEnd && isValid(parseISO(customEnd))) {
        // Add 1 day to make the end boundary exclusive
        end = startOfDay(parseISO(customEnd));
        end.setDate(end.getDate() + 1);
      } else {
        end = startOfTomorrow();
      }

      if (start > end) {
        // Swap if reversed
        const temp = start;
        start = end;
        end = temp;
      }

      return {
        startDate: start,
        endExclusiveDate: end,
        label: `${format(start, 'yyyy-MM-dd')} to ${format(new Date(end.getTime() - 1), 'yyyy-MM-dd')}`,
      };
    }
    default: {
      const start = subDays(startOfDay(now), 29);
      const end = startOfTomorrow();
      return { startDate: start, endExclusiveDate: end, label: 'Last 30 Days' };
    }
  }
}

/**
 * Calculates deterministic percentage, safely handling zero denominator.
 * Never returns NaN or Infinity.
 */
export function safePercentage(numerator: number, denominator: number, decimals: number = 1): number {
  if (!denominator || denominator <= 0 || isNaN(denominator)) return 0;
  if (isNaN(numerator)) return 0;
  const val = (numerator / denominator) * 100;
  return Number(val.toFixed(decimals));
}

/**
 * Formats monetary number into clean currency representation.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '¥0';
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (isNaN(num)) return '¥0';
  return `¥${num.toLocaleString('ja-JP', { maximumFractionDigits: 2 })}`;
}
