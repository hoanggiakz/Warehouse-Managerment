import { getWarehouses } from '@/app/actions/warehouses';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { StockCheckForm } from './stock-check-form';

export const dynamic = 'force-dynamic';

export default async function NewStockCheckPage() {
  await requirePermission(PERMISSIONS.STOCK_CHECK_CREATE);

  const warehousesRes = await getWarehouses(1, 1000, '', 'ACTIVE');
  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tạo phiếu kiểm kê mới</h2>
        <p className="text-muted-foreground">
          Khởi tạo đợt kiểm kê tồn kho, hệ thống sẽ tự động chụp số liệu snapshot tồn kho hiện tại làm căn cứ đối chiếu.
        </p>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-6">
        <StockCheckForm warehouses={warehouses} />
      </div>
    </div>
  );
}
