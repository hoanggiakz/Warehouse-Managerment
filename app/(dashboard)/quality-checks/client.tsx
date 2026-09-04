'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Search,
  Plus,
  Building2,
  CheckSquare,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  QualityCheckStatusBadge,
  QualityCheckResultBadge,
  QualityCheckSeverityBadge,
} from '@/components/quality-checks/quality-check-status-badge';

interface QualityChecksClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  result: string;
  severity: string;
  warehouseId: string;
  warehouses: any[];
  permissions: {
    create: boolean;
    complete: boolean;
    adjust: boolean;
  };
}

export function QualityChecksClient({
  initialData,
  total,
  page,
  totalPages,
  search,
  status,
  result,
  severity,
  warehouseId,
  warehouses,
  permissions,
}: QualityChecksClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, status, result, severity, warehouseId);
  };

  const updateFilters = (
    newSearch: string,
    newStatus: string,
    newResult: string,
    newSeverity: string,
    newWarehouseId: string
  ) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);
    if (newResult && newResult !== 'ALL') params.set('result', newResult);
    if (newSeverity && newSeverity !== 'ALL') params.set('severity', newSeverity);
    if (newWarehouseId && newWarehouseId !== 'ALL') params.set('warehouseId', newWarehouseId);

    router.push(`/quality-checks?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Tìm theo mã QC, phụ tùng, loại lỗi..."
              className="pl-8 bg-white"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <Select
            value={warehouseId || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, status, result, severity, val)}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="Kho hàng" />
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
            value={result || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, status, val, severity, warehouseId)}
          >
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Kết quả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả kết quả</SelectItem>
              <SelectItem value="PASSED">Đạt chuẩn (Passed)</SelectItem>
              <SelectItem value="PARTIALLY_PASSED">Đạt một phần</SelectItem>
              <SelectItem value="FAILED">Không đạt (Failed)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={severity || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, status, result, val, warehouseId)}
          >
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Mức độ lỗi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả mức độ</SelectItem>
              <SelectItem value="CRITICAL">Nghiêm trọng (Critical)</SelectItem>
              <SelectItem value="HIGH">Nặng (Major/High)</SelectItem>
              <SelectItem value="MEDIUM">Vừa (Moderate)</SelectItem>
              <SelectItem value="LOW">Nhẹ (Minor/Low)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={status || 'ALL'}
            onValueChange={(val) => updateFilters(searchValue, val, result, severity, warehouseId)}
          >
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
              <SelectItem value="DRAFT">Dự thảo (Draft)</SelectItem>
              <SelectItem value="IN_PROGRESS">Đang kiểm tra</SelectItem>
              <SelectItem value="COMPLETED">Đã hoàn tất</SelectItem>
              <SelectItem value="CANCELLED">Đã hủy</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" variant="secondary" className="bg-white">
            Lọc
          </Button>
        </form>

        {permissions.create && (
          <Link href="/quality-checks/new">
            <Button className="w-full md:w-auto">
              <Plus className="size-4 mr-1.5" /> Tạo phiếu QC mới
            </Button>
          </Link>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[140px]">Mã phiếu QC</TableHead>
              <TableHead>Phụ tùng</TableHead>
              <TableHead className="w-[150px]">Kho hàng</TableHead>
              <TableHead className="w-[120px] text-right">Số lượng</TableHead>
              <TableHead className="w-[140px] text-center">Kết quả</TableHead>
              <TableHead className="w-[130px]">Mức độ lỗi</TableHead>
              <TableHead className="w-[130px]">Trạng thái</TableHead>
              <TableHead className="w-[80px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  Không tìm thấy phiếu kiểm định chất lượng nào phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((qc) => {
                return (
                  <TableRow key={qc.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold font-mono text-xs">
                      <Link
                        href={`/quality-checks/${qc.id}`}
                        className="text-primary hover:underline flex items-center gap-1.5"
                      >
                        <FileCheck className="size-3.5" />
                        {qc.checkNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{qc.part.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {qc.part.sku} • {qc.part.category?.name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {qc.warehouse ? (
                        <div>
                          <div className="text-xs font-medium">{qc.warehouse.name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{qc.warehouse.code}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-xs font-bold">
                        {qc.quantityChecked} {qc.part.unit}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="text-emerald-600 font-semibold">{qc.quantityPassed} đạt</span>
                        {qc.quantityFailed > 0 && (
                          <span className="text-rose-600 font-semibold ml-1.5">/ {qc.quantityFailed} lỗi</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <QualityCheckResultBadge result={qc.result} />
                    </TableCell>
                    <TableCell>
                      {qc.quantityFailed > 0 ? (
                        <QualityCheckSeverityBadge severity={qc.severity} />
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <QualityCheckStatusBadge status={qc.status} />
                        {qc.isAdjusted && (
                          <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200">
                            Đã cân bằng kho
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/quality-checks/${qc.id}`}>
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
            Tổng số: <span className="font-medium text-foreground">{total}</span> phiếu kiểm định
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(page - 1));
                router.push(`/quality-checks?${params.toString()}`);
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
                router.push(`/quality-checks?${params.toString()}`);
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
