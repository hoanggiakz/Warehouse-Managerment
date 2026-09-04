'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  startQualityCheck,
  completeQualityCheck,
  cancelQualityCheck,
} from '@/app/actions/quality-checks';

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
  Package,
  AlertTriangle,
  FileCheck,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QualityCheckStatusBadge,
  QualityCheckResultBadge,
  QualityCheckSeverityBadge,
  QualityCheckActionBadge,
} from '@/components/quality-checks/quality-check-status-badge';
import { QualityCheckSummary } from '@/components/quality-checks/quality-check-summary';
import { DispositionDialog } from '@/components/quality-checks/disposition-dialog';
import { toast } from 'sonner';

interface QualityCheckDetailClientProps {
  qualityCheck: any;
  currentStock: number;
  permissions: {
    start: boolean;
    recordDefect: boolean;
    complete: boolean;
    adjust: boolean;
    cancel: boolean;
  };
}

export function QualityCheckDetailClient({
  qualityCheck,
  currentStock,
  permissions,
}: QualityCheckDetailClientProps) {
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [dispositionDialogOpen, setDispositionDialogOpen] = useState(false);

  const isDraft = qualityCheck.status === 'DRAFT';
  const isInProgress = qualityCheck.status === 'IN_PROGRESS';
  const isCompleted = qualityCheck.status === 'COMPLETED';
  const isCancelled = qualityCheck.status === 'CANCELLED';

  const hasDefects = qualityCheck.quantityFailed > 0;

  const handleStart = async () => {
    setIsProcessing(true);
    try {
      const res = await startQualityCheck(qualityCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã bắt đầu quy trình kiểm tra chất lượng (IN_PROGRESS)!');
        router.refresh();
      }
    } catch {
      toast.error('Không thể bắt đầu kiểm tra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      const res = await completeQualityCheck(qualityCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã chốt hoàn tất biên bản kiểm định chất lượng!');
        setCompleteDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Không thể hoàn tất phiếu kiểm tra.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsProcessing(true);
    try {
      const res = await cancelQualityCheck(qualityCheck.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Đã hủy phiếu kiểm tra chất lượng.');
        setCancelDialogOpen(false);
        router.refresh();
      }
    } catch {
      toast.error('Không thể hủy phiếu kiểm tra.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/quality-checks">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl md:text-2xl font-bold font-mono tracking-tight text-foreground">
                {qualityCheck.checkNumber}
              </h2>
              <QualityCheckStatusBadge status={qualityCheck.status} />
              <QualityCheckResultBadge result={qualityCheck.result} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lập lúc {format(new Date(qualityCheck.createdAt), 'dd/MM/yyyy HH:mm')} bởi{' '}
              <span className="font-semibold text-foreground">
                {qualityCheck.performer?.fullName || qualityCheck.performer?.username}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDraft && permissions.start && (
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
              Bắt đầu kiểm tra
            </Button>
          )}

          {(isDraft || isInProgress) && permissions.complete && (
            <Button
              onClick={() => setCompleteDialogOpen(true)}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="size-4 mr-1.5" />
              Chốt hoàn tất QC
            </Button>
          )}

          {isCompleted && permissions.adjust && hasDefects && !qualityCheck.isAdjusted && (
            <Button
              onClick={() => setDispositionDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <SlidersHorizontal className="size-4 mr-1.5" />
              Xử lý tồn kho ({qualityCheck.quantityFailed} lỗi)
            </Button>
          )}

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

      {/* KPI Summary Banner */}
      <QualityCheckSummary
        quantityChecked={qualityCheck.quantityChecked}
        quantityPassed={qualityCheck.quantityPassed}
        quantityFailed={qualityCheck.quantityFailed}
        severity={qualityCheck.severity}
        result={qualityCheck.result}
      />

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Part Information Card */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="size-4 text-primary" /> Thông tin phụ tùng kiểm tra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Mã SKU:</span>
              <span className="font-mono font-bold text-foreground">{qualityCheck.part.sku}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Tên phụ tùng:</span>
              <span className="font-semibold text-foreground text-right">{qualityCheck.part.name}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Danh mục:</span>
              <span>{qualityCheck.part.category?.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Đơn vị:</span>
              <span className="font-semibold">{qualityCheck.part.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nhà cung cấp:</span>
              <span>{qualityCheck.part.supplier?.name || '-'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse & Stock Card */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="size-4 text-primary" /> Bối cảnh kho & Tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Kho lưu trữ:</span>
              <span className="font-semibold text-foreground">
                {qualityCheck.warehouse?.name || 'Chưa liên kết kho'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Mã kho:</span>
              <span className="font-mono">{qualityCheck.warehouse?.code || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Tồn kho hiện tại:</span>
              <span className="font-mono font-bold text-foreground">
                {qualityCheck.warehouseId ? `${currentStock} ${qualityCheck.part.unit}` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phiếu nhập gốc:</span>
              {qualityCheck.importReceipt ? (
                <Link
                  href={`/imports/${qualityCheck.importReceipt.id}`}
                  className="text-primary hover:underline font-mono"
                >
                  {qualityCheck.importReceipt.receiptNumber}
                </Link>
              ) : (
                <span className="text-muted-foreground">Kiểm tra định kỳ (Không qua phiếu nhập)</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Inspector & History Card */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="size-4 text-primary" /> Người kiểm tra & Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Họ tên nhân viên:</span>
              <span className="font-semibold text-foreground">
                {qualityCheck.performer?.fullName || qualityCheck.performer?.username}
              </span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Bộ phận / Vai trò:</span>
              <span>{qualityCheck.performer?.role?.name || '-'}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-muted-foreground">Ngày kiểm tra:</span>
              <span className="font-medium">
                {format(new Date(qualityCheck.checkDate), 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cân bằng tồn kho:</span>
              {qualityCheck.isAdjusted ? (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">
                  Đã cân bằng ({format(new Date(qualityCheck.adjustedAt), 'dd/MM/yyyy HH:mm')})
                </Badge>
              ) : (
                <span className="text-muted-foreground">Chưa điều chỉnh</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Defect Analysis & Recommendation Section */}
      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-600" />
              Chi tiết khuyết tật & Khuyến nghị xử lý (Defect & Disposition)
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-normal">Phương án:</span>
              <QualityCheckActionBadge action={qualityCheck.action} />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {hasDefects ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg">
                  <div className="text-muted-foreground font-medium mb-1">Loại khuyết tật</div>
                  <div className="font-bold text-foreground text-sm">
                    {qualityCheck.failureType || 'Không phân loại'}
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg">
                  <div className="text-muted-foreground font-medium mb-1">Mức độ nghiêm trọng</div>
                  <QualityCheckSeverityBadge severity={qualityCheck.severity} />
                </div>

                <div className="p-3 bg-muted/40 rounded-lg">
                  <div className="text-muted-foreground font-medium mb-1">Số lượng lỗi / kiểm tra</div>
                  <div className="font-bold text-rose-600 text-sm">
                    {qualityCheck.quantityFailed} / {qualityCheck.quantityChecked} {qualityCheck.part.unit}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Mô tả chi tiết khuyết tật</label>
                <div className="p-3 border rounded-lg bg-gray-50/70 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {qualityCheck.failureDescription || 'Chưa ghi nhận mô tả chi tiết.'}
                </div>
              </div>

              {qualityCheck.dispositionNotes && (
                <div className="space-y-1.5 border-t pt-3">
                  <label className="text-xs font-semibold text-purple-900">Ghi chú phê duyệt xử lý tồn kho</label>
                  <div className="p-3 border border-purple-200 rounded-lg bg-purple-50/50 text-xs text-purple-950">
                    {qualityCheck.dispositionNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground text-xs flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="font-semibold text-foreground text-sm">
                100% phụ tùng đạt tiêu chuẩn kỹ thuật (PASSED)
              </p>
              <p className="text-muted-foreground">
                Không phát hiện lỗi hoặc khuyết tật nào trong đợt kiểm tra này. Phụ tùng đủ điều kiện tiếp nhận vào kho sản xuất/lắp ráp.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complete Confirmation Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận chốt hoàn tất kiểm định?</DialogTitle>
            <DialogDescription>
              Sau khi chốt phiếu kiểm định, kết quả ({qualityCheck.result || 'PASSED'}) sẽ được khóa. Lưu ý: Thao tác này <strong>không tự ý thay đổi số lượng tồn kho</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)} disabled={isProcessing}>
              Đóng
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Xác nhận chốt hoàn tất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy phiếu kiểm tra chất lượng?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy phiếu <strong className="font-mono">{qualityCheck.checkNumber}</strong>? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={isProcessing}>
              Không, quay lại
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disposition Dialog */}
      {hasDefects && qualityCheck.warehouse && (
        <DispositionDialog
          open={dispositionDialogOpen}
          onOpenChange={setDispositionDialogOpen}
          qualityCheckId={qualityCheck.id}
          checkNumber={qualityCheck.checkNumber}
          partName={qualityCheck.part.name}
          partSku={qualityCheck.part.sku}
          warehouseName={qualityCheck.warehouse.name}
          currentStock={currentStock}
          quantityFailed={qualityCheck.quantityFailed}
          currentAction={qualityCheck.action}
        />
      )}
    </div>
  );
}
