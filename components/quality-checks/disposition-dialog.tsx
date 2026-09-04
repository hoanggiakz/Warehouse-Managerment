'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustQualityDisposition } from '@/app/actions/quality-checks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SlidersHorizontal, Loader2, AlertTriangle, ShieldCheck, Box } from 'lucide-react';
import { toast } from 'sonner';

interface DispositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualityCheckId: number;
  checkNumber: string;
  partName: string;
  partSku: string;
  warehouseName: string;
  currentStock: number;
  quantityFailed: number;
  currentAction: string;
}

export function DispositionDialog({
  open,
  onOpenChange,
  qualityCheckId,
  checkNumber,
  partName,
  partSku,
  warehouseName,
  currentStock,
  quantityFailed,
  currentAction,
}: DispositionDialogProps) {
  const router = useRouter();
  const [action, setAction] = useState(currentAction || 'QUARANTINE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdjust = async () => {
    setIsSubmitting(true);
    try {
      const res = await adjustQualityDisposition({
        qualityCheckId,
        action: action as any,
        dispositionNotes: notes.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error, { duration: 6000 });
      } else {
        toast.success(`Đã xử lý xử lý tồn kho (${quantityFailed} phụ tùng) thành công!`);
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error('Có lỗi xảy ra khi thực hiện xử lý tồn kho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="size-5 text-purple-600" />
            Xử lý tồn kho theo khuyến nghị QC ({checkNumber})
          </DialogTitle>
          <DialogDescription>
            Cân bằng tồn kho cho phụ tùng lỗi theo biên bản kiểm định chất lượng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phụ tùng:</span>
              <span className="font-semibold text-foreground">{partSku} - {partName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kho lưu trữ:</span>
              <span className="font-semibold text-foreground">{warehouseName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tồn kho hiện tại:</span>
              <span className="font-mono font-bold text-foreground">{currentStock}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-rose-700 font-semibold">
              <span>Số lượng lỗi cần xử lý xuất kho:</span>
              <span className="font-mono">-{quantityFailed}</span>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50/50 text-amber-900">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertTitle className="text-xs font-semibold">Quy tắc toàn vẹn tồn kho (BR-40)</AlertTitle>
            <AlertDescription className="text-xs text-amber-800 mt-1">
              Giao dịch nguyên tử (prisma.$transaction) sẽ kiểm tra tồn kho trực tiếp trong database. Nếu tồn kho không đủ hoặc có giao dịch khác làm thay đổi số liệu, thao tác sẽ bị hủy bỏ để ngăn ngừa tồn kho âm.
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Phương án xử lý tồn kho</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Chọn phương án..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QUARANTINE">Cách ly chờ xử lý (Quarantine)</SelectItem>
                <SelectItem value="REJECT">Từ chối nhập / Loại bỏ (Reject)</SelectItem>
                <SelectItem value="RETURN_TO_SUPPLIER">Trả lại nhà cung cấp (Return to Supplier)</SelectItem>
                <SelectItem value="REWORK">Gia công / Sửa chữa lại (Rework)</SelectItem>
                <SelectItem value="DISPOSE">Tiêu hủy / Phế liệu (Dispose)</SelectItem>
                <SelectItem value="ACCEPT">Tiếp nhận có điều kiện (Accept)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Căn cứ / Ghi chú phê duyệt xử lý</label>
            <Input
              placeholder="VD: Biên bản loại bỏ phụ tùng lỗi theo QC..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm bg-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handleAdjust}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="size-4 mr-2" />
            )}
            Xác nhận xử lý tồn kho
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
