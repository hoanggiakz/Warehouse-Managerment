import { getWarehouses } from '@/app/actions/warehouses';
import { getParts } from '@/app/actions/parts';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { QualityCheckForm } from './quality-check-form';

export const dynamic = 'force-dynamic';

export default async function NewQualityCheckPage() {
  await requirePermission(PERMISSIONS.QUALITY_CHECK_CREATE);

  const [warehousesRes, partsRes] = await Promise.all([
    getWarehouses(1, 1000, '', 'ACTIVE'),
    getParts(1, 5000),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tạo phiếu kiểm định chất lượng (QC)</h2>
        <p className="text-muted-foreground">
          Ghi nhận thông tin kiểm tra ngoại quan, kích thước và thông số kỹ thuật phụ tùng.
        </p>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-6">
        <QualityCheckForm
          warehouses={warehousesRes.data || []}
          parts={partsRes.data || []}
        />
      </div>
    </div>
  );
}
