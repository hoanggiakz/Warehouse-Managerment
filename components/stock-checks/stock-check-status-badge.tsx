import { Badge } from '@/components/ui/badge';
import { StockCheckStatus, StockCheckDetailStatus } from '@prisma/client';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  SlidersHorizontal,
  XCircle,
  MinusCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface StockCheckStatusBadgeProps {
  status: StockCheckStatus | string;
  className?: string;
}

export function StockCheckStatusBadge({ status, className }: StockCheckStatusBadgeProps) {
  switch (status) {
    case 'DRAFT':
      return (
        <Badge variant="outline" className={`text-muted-foreground border-dashed ${className || ''}`}>
          <Clock className="size-3 mr-1" /> Dự thảo (Draft)
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="secondary" className={`bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 ${className || ''}`}>
          <PlayCircle className="size-3 mr-1 text-blue-600" /> Đang đếm (In Progress)
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="secondary" className={`bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 ${className || ''}`}>
          <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Đã chốt đếm (Completed)
        </Badge>
      );
    case 'ADJUSTED':
      return (
        <Badge variant="secondary" className={`bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200 ${className || ''}`}>
          <SlidersHorizontal className="size-3 mr-1 text-purple-600" /> Đã điều chỉnh (Adjusted)
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="size-3 mr-1" /> Đã hủy (Cancelled)
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}

interface StockDetailStatusBadgeProps {
  status: StockCheckDetailStatus | string;
  className?: string;
}

export function StockDetailStatusBadge({ status, className }: StockDetailStatusBadgeProps) {
  switch (status) {
    case 'NOT_COUNTED':
      return (
        <Badge variant="outline" className={`text-gray-500 bg-gray-50 border-gray-200 ${className || ''}`}>
          <MinusCircle className="size-3 mr-1 text-gray-400" /> Chưa đếm
        </Badge>
      );
    case 'MATCHED':
      return (
        <Badge variant="secondary" className={`bg-emerald-50 text-emerald-700 border-emerald-200 ${className || ''}`}>
          <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Khớp (0)
        </Badge>
      );
    case 'SURPLUS':
      return (
        <Badge variant="secondary" className={`bg-indigo-50 text-indigo-700 border-indigo-200 ${className || ''}`}>
          <TrendingUp className="size-3 mr-1 text-indigo-600" /> Thừa tồn kho
        </Badge>
      );
    case 'SHORTAGE':
      return (
        <Badge variant="secondary" className={`bg-rose-50 text-rose-700 border-rose-200 ${className || ''}`}>
          <TrendingDown className="size-3 mr-1 text-rose-600" /> Thiếu tồn kho
        </Badge>
      );
    case 'CONFLICT':
      return (
        <Badge variant="destructive" className={`bg-amber-600 hover:bg-amber-700 text-white ${className || ''}`}>
          <AlertTriangle className="size-3 mr-1 text-white" /> Xung đột
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}
