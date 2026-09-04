'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordStockCount } from '@/app/actions/stock-checks';
import { StockDetailStatusBadge } from './stock-check-status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StockCountTableProps {
  stockCheckId: number;
  checkStatus: string;
  canCount: boolean;
  details: Array<{
    id: number;
    partId: number;
    systemQty: number;
    actualQty: number | null;
    difference: number | null;
    status: string;
    notes: string | null;
    isAdjusted: boolean;
    part: {
      id: number;
      sku: string;
      name: string;
      unit: string;
      category?: { name: string } | null;
    };
  }>;
}

export function StockCountTable({
  stockCheckId,
  checkStatus,
  canCount,
  details,
}: StockCountTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'DISCREPANCY' | 'UNCOUNTED' | 'MATCHED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);

  // Local state for counts and notes
  const [countsMap, setCountsMap] = useState<Record<number, { actualQty: string; notes: string }>>(() => {
    const initial: Record<number, { actualQty: string; notes: string }> = {};
    for (const d of details) {
      initial[d.id] = {
        actualQty: d.actualQty !== null ? String(d.actualQty) : '',
        notes: d.notes || '',
      };
    }
    return initial;
  });

  const isEditable = canCount && (checkStatus === 'DRAFT' || checkStatus === 'IN_PROGRESS');

  const handleQtyChange = (detailId: number, value: string) => {
    setCountsMap((prev) => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        actualQty: value,
      },
    }));
  };

  const handleNotesChange = (detailId: number, value: string) => {
    setCountsMap((prev) => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        notes: value,
      },
    }));
  };

  const handleQuickMatchAll = () => {
    setCountsMap((prev) => {
      const next = { ...prev };
      for (const d of details) {
        if (!next[d.id] || next[d.id].actualQty === '') {
          next[d.id] = {
            actualQty: String(d.systemQty),
            notes: next[d.id]?.notes || '',
          };
        }
      }
      return next;
    });
    toast.info('Đã điền số thực tế = số hệ thống cho các mục chưa đếm');
  };

  const handleSaveCounts = async () => {
    // Gather all valid counts
    const payloadCounts: Array<{ detailId: number; actualQty: number; notes?: string }> = [];

    for (const d of details) {
      const entry = countsMap[d.id];
      if (entry && entry.actualQty.trim() !== '') {
        const qtyNum = parseInt(entry.actualQty.trim(), 10);
        if (isNaN(qtyNum) || qtyNum < 0) {
          toast.error(`Số lượng cho phụ tùng ${d.part.sku} không hợp lệ (phải >= 0).`);
          return;
        }
        payloadCounts.push({
          detailId: d.id,
          actualQty: qtyNum,
          notes: entry.notes.trim() || undefined,
        });
      }
    }

    if (payloadCounts.length === 0) {
      toast.error('Vui lòng nhập ít nhất một số lượng thực tế để lưu.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await recordStockCount({
        stockCheckId,
        counts: payloadCounts,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Đã lưu kết quả kiểm đếm (${payloadCounts.length} phụ tùng)!`);
        router.refresh();
      }
    } catch {
      toast.error('Không thể lưu kết quả kiểm đếm.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDetails = details.filter((d) => {
    const matchesSearch =
      d.part.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.part.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'DISCREPANCY') {
      const currentEntry = countsMap[d.id];
      if (currentEntry && currentEntry.actualQty.trim() !== '') {
        return parseInt(currentEntry.actualQty, 10) !== d.systemQty;
      }
      return d.status === 'SHORTAGE' || d.status === 'SURPLUS' || d.status === 'CONFLICT';
    }

    if (filterType === 'UNCOUNTED') {
      const currentEntry = countsMap[d.id];
      return !currentEntry || currentEntry.actualQty.trim() === '';
    }

    if (filterType === 'MATCHED') {
      const currentEntry = countsMap[d.id];
      if (currentEntry && currentEntry.actualQty.trim() !== '') {
        return parseInt(currentEntry.actualQty, 10) === d.systemQty;
      }
      return d.status === 'MATCHED';
    }

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo mã SKU, tên phụ tùng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-white p-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterType === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tất cả ({details.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('DISCREPANCY')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterType === 'DISCREPANCY'
                  ? 'bg-rose-600 text-white'
                  : 'text-muted-foreground hover:text-rose-600'
              }`}
            >
              Chênh lệch
            </button>
            <button
              type="button"
              onClick={() => setFilterType('UNCOUNTED')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterType === 'UNCOUNTED'
                  ? 'bg-gray-800 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Chưa đếm
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MATCHED')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterType === 'MATCHED'
                  ? 'bg-emerald-600 text-white'
                  : 'text-muted-foreground hover:text-emerald-600'
              }`}
            >
              Khớp
            </button>
          </div>

          {isEditable && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickMatchAll}
                className="text-xs bg-white"
              >
                <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />
                Điền khớp nhanh
              </Button>

              <Button
                size="sm"
                onClick={handleSaveCounts}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-xs"
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="size-3.5 mr-1.5" />
                )}
                Lưu số liệu đếm
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[120px]">Mã SKU</TableHead>
              <TableHead>Tên phụ tùng</TableHead>
              <TableHead className="w-[110px]">Danh mục</TableHead>
              <TableHead className="w-[100px] text-right">Tồn hệ thống</TableHead>
              <TableHead className="w-[120px] text-center">Thực tế</TableHead>
              <TableHead className="w-[110px] text-center">Chênh lệch</TableHead>
              <TableHead className="w-[130px]">Trạng thái</TableHead>
              <TableHead className="min-w-[160px]">Ghi chú / Lý do</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDetails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Không tìm thấy phụ tùng nào phù hợp với bộ lọc.
                </TableCell>
              </TableRow>
            ) : (
              filteredDetails.map((detail) => {
                const entry = countsMap[detail.id] || { actualQty: '', notes: '' };
                const hasValue = entry.actualQty.trim() !== '';
                const parsedActual = hasValue ? parseInt(entry.actualQty, 10) : null;
                const diff = parsedActual !== null && !isNaN(parsedActual) ? parsedActual - detail.systemQty : null;

                let rowStatus = detail.status;
                if (diff !== null) {
                  if (diff === 0) rowStatus = 'MATCHED';
                  else if (diff > 0) rowStatus = 'SURPLUS';
                  else rowStatus = 'SHORTAGE';
                } else if (!hasValue) {
                  rowStatus = 'NOT_COUNTED';
                }

                return (
                  <TableRow
                    key={detail.id}
                    className={
                      diff !== null && diff !== 0
                        ? 'bg-rose-50/20'
                        : detail.isAdjusted
                        ? 'bg-purple-50/20'
                        : ''
                    }
                  >
                    <TableCell className="font-semibold text-xs font-mono">
                      {detail.part.sku}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{detail.part.name}</div>
                      <div className="text-xs text-muted-foreground">Đơn vị: {detail.part.unit}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {detail.part.category?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {detail.systemQty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditable ? (
                        <Input
                          type="number"
                          min="0"
                          value={entry.actualQty}
                          onChange={(e) => handleQtyChange(detail.id, e.target.value)}
                          placeholder="Nhập..."
                          className="h-8 w-24 text-center mx-auto text-sm bg-white"
                        />
                      ) : (
                        <span className="font-semibold text-sm">
                          {detail.actualQty !== null ? detail.actualQty.toLocaleString() : '-'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {diff !== null ? (
                        <Badge
                          variant="outline"
                          className={
                            diff === 0
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              : diff > 0
                              ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                              : 'text-rose-700 bg-rose-50 border-rose-200 font-semibold'
                          }
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <StockDetailStatusBadge status={rowStatus} />
                        {detail.isAdjusted && (
                          <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">
                            Đã đồng bộ
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditable ? (
                        <Input
                          value={entry.notes}
                          onChange={(e) => handleNotesChange(detail.id, e.target.value)}
                          placeholder="Ghi chú lệch kho..."
                          className="h-8 text-xs bg-white"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{detail.notes || '-'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
