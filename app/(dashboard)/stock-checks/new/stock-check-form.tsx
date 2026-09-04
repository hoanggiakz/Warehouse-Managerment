'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createStockCheck, getWarehouseInventoryForStockCheck } from '@/app/actions/stock-checks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Building2, Camera, Search, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StockCheckFormProps {
  warehouses: Array<{
    id: number;
    name: string;
    code: string;
  }>;
}

export function StockCheckForm({ warehouses }: StockCheckFormProps) {
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState<string>(
    warehouses.length > 0 ? warehouses[0].id.toString() : ''
  );
  const [checkDate, setCheckDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [checkMode, setCheckMode] = useState<'FULL' | 'SELECTIVE'>('FULL');

  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<number[]>([]);
  const [partSearch, setPartSearch] = useState<string>('');
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When warehouse changes, fetch its parts
  useEffect(() => {
    if (!warehouseId) return;

    let isMounted = true;
    setIsLoadingParts(true);

    getWarehouseInventoryForStockCheck(Number(warehouseId))
      .then((res: any) => {
        if (!isMounted) return;
        if (res?.inventories) {
          const partsList = res.inventories.map((inv: any) => ({
            id: inv.part.id,
            sku: inv.part.sku,
            name: inv.part.name,
            unit: inv.part.unit,
            category: inv.part.category?.name,
            currentQty: inv.quantity,
          }));
          setAvailableParts(partsList);
          // By default in selective mode, select none or all
          setSelectedPartIds([]);
        } else {
          setAvailableParts([]);
        }
      })
      .catch(() => {
        if (isMounted) setAvailableParts([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingParts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [warehouseId]);

  const togglePartSelection = (partId: number) => {
    setSelectedPartIds((prev) =>
      prev.includes(partId) ? prev.filter((id) => id !== partId) : [...prev, partId]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredParts.map((p) => p.id);
    setSelectedPartIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(filteredParts.map((p) => p.id));
    setSelectedPartIds((prev) => prev.filter((id) => !visibleIds.has(id)));
  };

  const filteredParts = availableParts.filter(
    (p) =>
      p.sku.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(partSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouseId) {
      toast.error('Vui lòng chọn kho kiểm kê.');
      return;
    }

    if (checkMode === 'SELECTIVE' && selectedPartIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất một phụ tùng để kiểm kê.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStockCheck({
        warehouseId: Number(warehouseId),
        checkDate,
        notes: notes.trim() || undefined,
        partIds: checkMode === 'SELECTIVE' ? selectedPartIds : undefined,
      });

      if (res?.error) {
        toast.error(res.error);
      } else if (res?.data) {
        toast.success(`Đã tạo phiếu kiểm kê ${res.data.checkNumber} thành công!`);
        router.push(`/stock-checks/${res.data.id}`);
      }
    } catch {
      toast.error('Có lỗi xảy ra khi tạo phiếu kiểm kê.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="size-4 text-muted-foreground" /> Kho kiểm kê *
          </label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Chọn kho kiểm kê..." />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Ngày kiểm kê</label>
          <Input
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Phạm vi kiểm kê</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 flex-1 bg-white hover:bg-muted/30">
            <input
              type="radio"
              name="checkMode"
              checked={checkMode === 'FULL'}
              onChange={() => setCheckMode('FULL')}
              className="accent-primary size-4"
            />
            <div>
              <div className="text-sm font-medium">Toàn bộ kho (Full Warehouse)</div>
              <div className="text-xs text-muted-foreground">
                Tự động kiểm đếm tất cả các phụ tùng hiện có trong kho ({availableParts.length} phụ tùng)
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer border rounded-lg p-3 flex-1 bg-white hover:bg-muted/30">
            <input
              type="radio"
              name="checkMode"
              checked={checkMode === 'SELECTIVE'}
              onChange={() => setCheckMode('SELECTIVE')}
              className="accent-primary size-4"
            />
            <div>
              <div className="text-sm font-medium">Chọn lọc phụ tùng (Selective)</div>
              <div className="text-xs text-muted-foreground">
                Chỉ kiểm tra danh sách phụ tùng cụ thể được chọn ({selectedPartIds.length} đã chọn)
              </div>
            </div>
          </label>
        </div>
      </div>

      {checkMode === 'SELECTIVE' && (
        <div className="space-y-3 border rounded-lg p-4 bg-gray-50/50">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã SKU hoặc tên phụ tùng..."
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                className="pl-8 bg-white h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllVisible}
                className="text-xs h-8 bg-white"
              >
                Chọn tất cả
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllVisible}
                className="text-xs h-8 bg-white"
              >
                Bỏ chọn
              </Button>
            </div>
          </div>

          <div className="border rounded-md bg-white max-h-60 overflow-y-auto divide-y">
            {isLoadingParts ? (
              <div className="py-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Đang tải danh sách phụ tùng của kho...
              </div>
            ) : filteredParts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Không tìm thấy phụ tùng nào trong kho này.
              </div>
            ) : (
              filteredParts.map((p) => {
                const isSelected = selectedPartIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePartSelection(p.id)}
                    className="flex items-center justify-between p-2.5 hover:bg-muted/30 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} onCheckedChange={() => togglePartSelection(p.id)} />
                      <div>
                        <span className="font-mono font-bold text-foreground">{p.sku}</span>
                        <span className="ml-2 font-medium">{p.name}</span>
                        {p.category && (
                          <span className="ml-2 text-muted-foreground">({p.category})</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-muted-foreground">
                      Tồn hiện tại: <span className="font-semibold text-foreground">{p.currentQty}</span> {p.unit}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Ghi chú đợt kiểm kê</label>
        <Input
          placeholder="VD: Kiểm kê định kỳ quý 3, kiểm đếm kệ hàng khu vực A..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="bg-white"
        />
      </div>

      <Alert className="bg-blue-50/60 border-blue-200 text-blue-900">
        <Camera className="size-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          Khi nhấn tạo phiếu, hệ thống sẽ lưu lại ảnh chụp số lượng (Snapshot) tức thời của các phụ tùng. Phiếu sẽ bắt đầu ở trạng thái <strong>Dự thảo (Draft)</strong> để nhân viên tiến hành nhập số lượng thực tế.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between pt-4 border-t">
        <Link href="/stock-checks">
          <Button type="button" variant="outline">
            <ArrowLeft className="size-4 mr-1.5" /> Quay lại danh sách
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <CheckSquare className="size-4 mr-2" />
          )}
          Tạo phiếu kiểm kê
        </Button>
      </div>
    </form>
  );
}
