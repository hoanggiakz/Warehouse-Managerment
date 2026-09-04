import { getExportReceipts } from '@/app/actions/exports';
import { getWarehouses } from '@/app/actions/warehouses';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { ExportsClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ExportsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string; warehouseId?: string };
}) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_VIEW);

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const warehouseId = searchParams.warehouseId || '';

  const [{ data, total, totalPages }, warehousesRes] = await Promise.all([
    getExportReceipts(page, 20, search, status, warehouseId),
    getWarehouses(1, 100),
  ]);

  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Export Receipts</h2>
        <p className="text-muted-foreground">
          Manage outbound stock shipments, assembly dispatches, and warehouse transfers.
        </p>
      </div>

      <ExportsClient
        initialData={data}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        warehouseId={warehouseId}
        warehouses={warehouses}
        permissions={{
          create: hasPermission(session.permissions, PERMISSIONS.EXPORTS_CREATE),
        }}
      />
    </div>
  );
}
