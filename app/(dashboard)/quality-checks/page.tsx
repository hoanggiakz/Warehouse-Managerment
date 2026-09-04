import { getQualityChecks } from '@/app/actions/quality-checks';
import { getWarehouses } from '@/app/actions/warehouses';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { QualityChecksClient } from './client';

export const dynamic = 'force-dynamic';

export default async function QualityChecksPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
    result?: string;
    severity?: string;
    warehouseId?: string;
  };
}) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_VIEW);

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const result = searchParams.result || '';
  const severity = searchParams.severity || '';
  const warehouseId = searchParams.warehouseId || '';

  const [{ data, total, totalPages }, warehousesRes] = await Promise.all([
    getQualityChecks(page, 20, search, status, result, severity, warehouseId),
    getWarehouses(1, 100),
  ]);

  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kiểm định & Quản lý chất lượng (QC)</h2>
        <p className="text-muted-foreground">
          Quản lý biên bản kiểm định chất lượng phụ tùng, phân loại khuyết tật và đề xuất xử lý tồn kho.
        </p>
      </div>

      <QualityChecksClient
        initialData={data}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        result={result}
        severity={severity}
        warehouseId={warehouseId}
        warehouses={warehouses}
        permissions={{
          create: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_CREATE),
          complete: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_COMPLETE),
          adjust: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_ADJUST),
        }}
      />
    </div>
  );
}
