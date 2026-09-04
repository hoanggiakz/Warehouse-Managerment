'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStockFromCheck } from '@/app/actions/stock-checks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SlidersHorizontal, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface DiscrepancyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockCheckId: number;
  checkNumber: string;
  warehouseName: string;
  discrepancies: Array<{
    id: number;
    partId: number;
    systemQty: number;
    actualQty: number | null;
    difference: number | null;
    status: string;
    part: {
      sku: string;
      name: string;
      unit: string;
    };
  }>;
}

export function DiscrepancyDialog({
  open,
  onOpenChange,
  stockCheckId,
  checkNumber,
  warehouseName,
  discrepancies,
}: DiscrepancyDialogProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleAdjust = async () => {
    setIsAdjusting(true);
    try {
      const res = await adjustStockFromCheck({
        stockCheckId,
        notes: notes.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error, { duration: 6000 });
      } else {
        toast.success(`Đã cân bằng tồn kho thành công cho ${res.count} phụ tùng!`);
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast.error('Có lỗi xảy ra khi thực hiện cân bằng kho.');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="size-5 text-purple-600" />
            Cân bằng tồn kho từ phiếu kiểm kê ({checkNumber})
          </DialogTitle>
          <DialogDescription>
            Kho: <span className="font-semibold text-foreground">{warehouseName}</span>. Xem xét và xác nhận điều chỉnh số liệu tồn kho trực tiếp theo kết quả kiểm đếm thực tế.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2 overflow-y-auto pr-1">
          <Alert className="border-amber-200 bg-amber-50/50 text-amber-900">
            <AlertTriangle className="size-4 text-amber-600" />
            <AlertTitle className="text-xs font-semibold">Cơ chế bảo vệ đồng thời (Concurrency Protection)</AlertTitle>
            <AlertDescription className="text-xs text-amber-800 mt-1">
              Giao dịch sẽ kiểm tra tồn kho hiện tại trong cơ sở dữ liệu. Nếu có bất kỳ phiếu nhập/xuất nào phát sinh làm thay đổi số liệu snapshot ban đầu, giao dịch sẽ tự động chặn và ghi nhật ký cảnh báo xung đột (Conflict).
            </AlertDescription>
          </Alert>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-xs">
                  <TableHead>Phụ tùng</TableHead>
                  <TableHead className="text-right">Tồn cũ</TableHead>
                  <TableHead className="text-center">Thực tế</TableHead>
                  <TableHead className="text-center">Điều chỉnh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discrepancies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                      Không có chênh lệch nào cần điều chỉnh.
                    </TableCell>
                  </TableRow>
                ) : (
                  discrepancies.map((d) => {
                    const diff = d.difference ?? 0;
                    return (
                      <TableRow key={d.id} className="text-xs">
                        <TableCell>
                          <span className="font-mono font-bold text-foreground">{d.part.sku}</span>
                          <div className="text-muted-foreground truncate max-w-[240px]">{d.part.name}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{d.systemQty.toLocaleString()}</TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {d.actualQty?.toLocaleString() ?? '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              diff > 0
                                ? 'text-indigo-700 bg-indigo-50 border-indigo-200 font-semibold'
                                : 'text-rose-700 bg-rose-50 border-rose-200 font-semibold'
                            }
                          >
                            {diff > 0 ? `+${diff}` : diff} {d.part.unit}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Lý do / Căn cứ phê duyệt điều chỉnh</label>
            <Input
              placeholder="VD: Điều chỉnh tồn kho định kỳ theo biên bản kiểm kê tháng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdjusting}
          >
            Đóng
          </Button>
          <Button
            type="button"
            onClick={handleAdjust}
            disabled={isAdjusting || discrepancies.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isAdjusting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="size-4 mr-2" />
            )}
            Xác nhận điều chỉnh ({discrepancies.length} mục)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
