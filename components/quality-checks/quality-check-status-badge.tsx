import { Badge } from '@/components/ui/badge';
import {
  QualityCheckStatus,
  QualityCheckResult,
  QualityCheckSeverity,
  QualityCheckAction,
} from '@prisma/client';
import {
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Flame,
  RotateCcw,
  Trash2,
  Wrench,
  PackageX,
  FileCheck,
} from 'lucide-react';

interface StatusBadgeProps {
  status: QualityCheckStatus | string;
  className?: string;
}

export function QualityCheckStatusBadge({ status, className }: StatusBadgeProps) {
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
          <PlayCircle className="size-3 mr-1 text-blue-600" /> Đang kiểm tra
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="secondary" className={`bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 ${className || ''}`}>
          <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Đã hoàn tất
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="destructive" className={className}>
          <XCircle className="size-3 mr-1" /> Đã hủy
        </Badge>
      );
    case 'REVIEWED':
      return (
        <Badge variant="secondary" className={`bg-purple-100 text-purple-800 ${className || ''}`}>
          Đã xem xét
        </Badge>
      );
    case 'RESOLVED':
      return (
        <Badge variant="secondary" className={`bg-teal-100 text-teal-800 ${className || ''}`}>
          Đã xử lý
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{status}</Badge>;
  }
}

interface ResultBadgeProps {
  result?: QualityCheckResult | string | null;
  className?: string;
}

export function QualityCheckResultBadge({ result, className }: ResultBadgeProps) {
  switch (result) {
    case 'PASSED':
      return (
        <Badge variant="secondary" className={`bg-emerald-50 text-emerald-700 border-emerald-200 ${className || ''}`}>
          <ShieldCheck className="size-3 mr-1 text-emerald-600" /> Đạt chuẩn (PASSED)
        </Badge>
      );
    case 'PARTIALLY_PASSED':
      return (
        <Badge variant="secondary" className={`bg-amber-50 text-amber-700 border-amber-200 ${className || ''}`}>
          <AlertTriangle className="size-3 mr-1 text-amber-600" /> Đạt một phần (PARTIAL)
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className={`bg-rose-600 text-white ${className || ''}`}>
          <AlertCircle className="size-3 mr-1" /> Không đạt (FAILED)
        </Badge>
      );
    default:
      return <Badge variant="outline" className={`text-gray-500 bg-gray-50 ${className || ''}`}>Chưa chốt</Badge>;
  }
}

interface SeverityBadgeProps {
  severity?: QualityCheckSeverity | string | null;
  className?: string;
}

export function QualityCheckSeverityBadge({ severity, className }: SeverityBadgeProps) {
  switch (severity) {
    case 'LOW':
    case 'MINOR':
      return (
        <Badge variant="outline" className={`text-blue-700 bg-blue-50 border-blue-200 text-[11px] ${className || ''}`}>
          Nhẹ (Minor/Low)
        </Badge>
      );
    case 'MEDIUM':
    case 'MODERATE':
      return (
        <Badge variant="outline" className={`text-amber-700 bg-amber-50 border-amber-200 text-[11px] ${className || ''}`}>
          Vừa (Moderate)
        </Badge>
      );
    case 'HIGH':
    case 'MAJOR':
      return (
        <Badge variant="secondary" className={`bg-orange-100 text-orange-800 border-orange-200 text-[11px] ${className || ''}`}>
          Nặng (Major/High)
        </Badge>
      );
    case 'CRITICAL':
      return (
        <Badge variant="destructive" className={`bg-red-600 text-white text-[11px] font-bold animate-pulse ${className || ''}`}>
          <Flame className="size-3 mr-1 text-white" /> Nghiêm trọng (Critical)
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{severity || 'Không có'}</Badge>;
  }
}

interface ActionBadgeProps {
  action?: QualityCheckAction | string | null;
  className?: string;
}

export function QualityCheckActionBadge({ action, className }: ActionBadgeProps) {
  switch (action) {
    case 'ACCEPT':
      return (
        <Badge variant="outline" className={`text-emerald-700 bg-emerald-50 border-emerald-200 text-xs ${className || ''}`}>
          <FileCheck className="size-3 mr-1" /> Tiếp nhận (Accept)
        </Badge>
      );
    case 'QUARANTINE':
      return (
        <Badge variant="secondary" className={`bg-amber-100 text-amber-800 border-amber-200 text-xs ${className || ''}`}>
          <AlertTriangle className="size-3 mr-1" /> Cách ly chờ xử lý (Quarantine)
        </Badge>
      );
    case 'REJECT':
      return (
        <Badge variant="destructive" className={`text-xs ${className || ''}`}>
          <PackageX className="size-3 mr-1" /> Từ chối nhập (Reject)
        </Badge>
      );
    case 'REPAIR':
    case 'REWORK':
      return (
        <Badge variant="outline" className={`text-indigo-700 bg-indigo-50 border-indigo-200 text-xs ${className || ''}`}>
          <Wrench className="size-3 mr-1" /> Sửa chữa / Gia công lại (Rework)
        </Badge>
      );
    case 'RETURN':
    case 'RETURN_TO_SUPPLIER':
      return (
        <Badge variant="outline" className={`text-purple-700 bg-purple-50 border-purple-200 text-xs ${className || ''}`}>
          <RotateCcw className="size-3 mr-1" /> Trả nhà cung cấp (Return)
        </Badge>
      );
    case 'DISPOSE':
    case 'RECYCLE':
      return (
        <Badge variant="outline" className={`text-gray-700 bg-gray-100 border-gray-200 text-xs ${className || ''}`}>
          <Trash2 className="size-3 mr-1" /> Tiêu hủy / Tái chế
        </Badge>
      );
    case 'REINSPECT':
      return (
        <Badge variant="outline" className={`text-blue-700 bg-blue-50 border-blue-200 text-xs ${className || ''}`}>
          Kiểm tra lại (Re-inspect)
        </Badge>
      );
    default:
      return <Badge variant="outline" className={className}>{action || '-'}</Badge>;
  }
}
