'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Search, Plus, Building2, ClipboardCheck, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StockCheckStatusBadge } from '@/components/stock-checks/stock-check-status-badge';

interface StockChecksClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  warehouseId: string;
  warehouses: any[];
  permissions: {
    create: boolean;
    count: boolean;
    adjust: boolean;
  };
}

export function StockChecksClient({
  initialData,
  total,
  page,
  totalPages,
  search,
  status,
  warehouseId,
  warehouses,
  permissions,
}: StockChecksClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, warehouseId, status);
  };

  const updateFilters = (newSearch: string, newWarehouseId: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newWarehouseId && newWarehouseId !== 'ALL') params.set('warehouseId', newWarehouseId);
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);

    router.push(`/stock-checks?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo mã phiếu, kho hoặc ghi chú..."
              className="pl-8 bg-white"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <Select
            value={warehouseId || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, val, status)}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Chọn kho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả các kho</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, warehouseId, val)}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="DRAFT">Dự thảo (Draft)</SelectItem>
              <SelectItem value="IN_PROGRESS">Đang đếm (In Progress)</SelectItem>
              <SelectItem value="COMPLETED">Đã chốt đếm (Completed)</SelectItem>
              <SelectItem value="ADJUSTED">Đã điều chỉnh (Adjusted)</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy (Cancelled)</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" variant="secondary" className="bg-white">
            Lọc
          </Button>
        </form>

        {permissions.create && (
          <Link href="/stock-checks/new">
            <Button className="w-full md:w-auto">
              <Plus className="size-4 mr-1.5" /> Tạo phiếu kiểm kê
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[160px]">Mã phiếu</TableHead>
              <TableHead>Kho kiểm kê</TableHead>
              <TableHead>Người lập</TableHead>
              <TableHead className="w-[140px]">Ngày kiểm</TableHead>
              <TableHead className="w-[160px]">Tiến độ đếm</TableHead>
              <TableHead className="w-[140px]">Trạng thái</TableHead>
              <TableHead className="w-[80px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  Chưa có phiếu kiểm kê nào phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((check) => {
                const totalDetails = check.details?.length || check._count?.details || 0;
                const countedDetails = (check.details || []).filter((d: any) => d.actualQty !== null).length;
                const discrepancyCount = (check.details || []).filter(
                  (d: any) => d.actualQty !== null && d.difference !== 0
                ).length;

                return (
                  <TableRow key={check.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold font-mono text-sm">
                      <Link
                        href={`/stock-checks/${check.id}`}
                        className="text-primary hover:underline flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="size-3.5" />
                        {check.checkNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {check.warehouse?.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {check.warehouse?.code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{check.performer?.fullName || check.performer?.username}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(check.checkDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-xs font-medium">
                          {countedDetails}/{totalDetails} phụ tùng
                        </div>
                        {discrepancyCount > 0 && (
                          <div className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            {discrepancyCount} lệch kho
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StockCheckStatusBadge status={check.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/stock-checks/${check.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="size-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2 text-sm text-muted-foreground">
          <div>
            Tổng số: <span className="font-medium text-foreground">{total}</span> phiếu kiểm kê
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page - 1));
                router.push(`/stock-checks?${params.toString()}`);
              }}
            >
              Trang trước
            </Button>
            <span>
              Trang {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page + 1));
                router.push(`/stock-checks?${params.toString()}`);
              }}
            >
              Trang sau
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
