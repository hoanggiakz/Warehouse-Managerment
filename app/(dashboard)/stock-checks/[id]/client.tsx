'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  startStockCheck,
  completeStockCheck,
  cancelStockCheck,
} from '@/app/actions/stock-checks';

import {
  ArrowLeft,
  Building2,
  User,
  Calendar,
  PlayCircle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Loader2,
  FileText,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StockCheckStatusBadge } from '@/components/stock-checks/stock-check-status-badge';
import { StockCheckSummary } from '@/components/stock-checks/stock-check-summary';
import { StockCountTable } from '@/components/stock-checks/stock-count-table';
import { DiscrepancyDialog } from '@/components/stock-checks/discrepancy-dialog';
import { toast } from 'sonner';

interface StockCheckDetailClientProps {
  stockCheck: any;
  permissions: {
    count: boolean;
    complete: boolean;
    adjust: boolean;
    cancel: boolean;
  };
}

export function StockCheckDetailClient({
  stockCheck,
  permissions,
}: StockCheckDetailClientProps) {
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  const isDraft = stockCheck.status === 'DRAFT';
  const isInProgress = stockCheck.status === 'IN_PROGRESS';
  const isCompleted = stockCheck.status === 'COMPLETED';
  const isAdjusted = stockCheck.status === 'ADJUSTED';
  const isCancelled = stockCheck.status === 'CANCELLED';

  const discrepancies = (stockCheck.details || []).filter(
    (d: any) => d.actualQty !== null && d.difference !== 0
  );

  const uncountedCount = (stockCheck.details || []).filter(
    (d: any) => d.actualQty === null
  ).length;

  const handleStart = async () => {
    setIsProcessing(true);
    try {
      const res = await startStockCheck(stockCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã chuyển sang trạng thái Đang đếm (IN_PROGRESS)!');
        router.refresh();
      }
    } catch {
      toast.error('Không thể bắt đầu kiểm kê.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      const res = await completeStockCheck(stockCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã chốt kết quả kiểm đếm thành công!');
        setCompleteDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Không thể chốt kiểm kê.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      const res = await cancelStockCheck(stockCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã hủy phiếu kiểm kê.');
        setCancelDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Không thể hủy phiếu kiểm kê.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/stock-checks">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-bold font-mono tracking-tight text-foreground">
                {stockCheck.checkNumber}
              </h2>
              <StockCheckStatusBadge status={stockCheck.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tạo lúc {format(new Date(stockCheck.createdAt), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Draft actions */}
          {isDraft && permissions.count && (
            <Button
              onClick={handleStart}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <PlayCircle className="size-4 mr-1.5" />
              )}
              Bắt đầu kiểm đếm
            </Button>
          )}

          {/* In Progress actions */}
          {isInProgress && permissions.complete && (
            <Button
              onClick={() => setCompleteDialogOpen(true)}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-4 mr-1.5" />
              Chốt kết quả kiểm kê
            </Button>
          )}

          {/* Completed actions: Manager/Admin adjustment */}
          {isCompleted && permissions.adjust && discrepancies.length > 0 && (
            <Button
              onClick={() => setAdjustDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <SlidersHorizontal className="size-4 mr-1.5" />
              Cân bằng tồn kho ({discrepancies.length} mục)
            </Button>
          )}

          {/* Cancel button */}
          {(isDraft || isInProgress) && permissions.cancel && (
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isProcessing}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              <XCircle className="size-4 mr-1.5" />
              Hủy phiếu
            </Button>
          )}
        </div>
      </div>

      {/* Header Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-3.5 bg-white shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Kho kiểm kê</p>
            <p className="text-sm font-semibold mt-0.5 text-foreground">{stockCheck.warehouse.name}</p>
            <p className="text-xs font-mono text-muted-foreground">{stockCheck.warehouse.code}</p>
          </div>
        </div>

        <div className="border rounded-lg p-3.5 bg-white shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <User className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Người thực hiện</p>
            <p className="text-sm font-semibold mt-0.5 text-foreground">
              {stockCheck.performer?.fullName || stockCheck.performer?.username}
            </p>
            <p className="text-xs text-muted-foreground">{stockCheck.performer?.role?.name}</p>
          </div>
        </div>

        <div className="border rounded-lg p-3.5 bg-white shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Calendar className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Ngày kiểm kê</p>
            <p className="text-sm font-semibold mt-0.5 text-foreground">
              {format(new Date(stockCheck.checkDate), 'dd/MM/yyyy')}
            </p>
            <p className="text-xs text-muted-foreground">Thời điểm chốt: {format(new Date(stockCheck.updatedAt), 'HH:mm')}</p>
          </div>
        </div>

        <div className="border rounded-lg p-3.5 bg-white shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-gray-50 text-gray-600">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Ghi chú đợt kiểm</p>
            <p className="text-xs font-medium mt-0.5 text-foreground line-clamp-2">
              {stockCheck.notes || 'Không có ghi chú.'}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <StockCheckSummary details={stockCheck.details || []} />

      {/* Interactive Count Table */}
      <StockCountTable
        stockCheckId={stockCheck.id}
        checkStatus={stockCheck.status}
        canCount={permissions.count}
        details={stockCheck.details || []}
      />

      {/* Dialog: Complete Stock Check Confirmation */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chốt kết quả kiểm kê?</DialogTitle>
            <DialogDescription>
              Sau khi chốt phiếu, số lượng thực tế sẽ được khóa và không thể chỉnh sửa tiếp tục.
            </DialogDescription>
          </DialogHeader>

          {uncountedCount > 0 ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
              Cảnh báo: Hiện còn <strong>{uncountedCount}</strong> phụ tùng chưa nhập số lượng kiểm đếm thực tế. Bạn cần điền đầy đủ trước khi chốt phiếu.
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
              Tất cả phụ tùng đã được đếm thực tế. Đợt kiểm kê có <strong>{discrepancies.length}</strong> mục có chênh lệch tồn kho.
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} disabled={isProcessing}>
              Đóng
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isProcessing || uncountedCount > 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Xác nhận chốt phiếu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cancel Stock Check Confirmation */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy phiếu kiểm kê?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy phiếu kiểm kê <strong className="font-mono">{stockCheck.checkNumber}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={isProcessing}>
              Không, quay lại
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Discrepancy Adjustment */}
      <DiscrepancyDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        stockCheckId={stockCheck.id}
        checkNumber={stockCheck.checkNumber}
        warehouseName={stockCheck.warehouse.name}
        discrepancies={discrepancies}
      />
    </div>
  );
}
