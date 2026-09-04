import { getStockChecks } from '@/app/actions/stock-checks';
import { getWarehouses } from '@/app/actions/warehouses';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { StockChecksClient } from './client';

export const dynamic = 'force-dynamic';

export default async function StockChecksPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string; warehouseId?: string };
}) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_VIEW);

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const warehouseId = searchParams.warehouseId || '';

  const [{ data, total, totalPages }, warehousesRes] = await Promise.all([
    getStockChecks(page, 20, search, status, warehouseId),
    getWarehouses(1, 100),
  ]);

  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kiểm kê & Khớp số liệu tồn kho</h2>
        <p className="text-muted-foreground">
          Quản lý các đợt kiểm kê định kỳ, kiểm đếm thực tế và điều chỉnh chênh lệch tồn kho.
        </p>
      </div>

      <StockChecksClient
        initialData={data}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        warehouseId={warehouseId}
        warehouses={warehouses}
        permissions={{
          create: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_CREATE),
          count: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_COUNT),
          adjust: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_ADJUST),
        }}
      />
    </div>
  );
}
