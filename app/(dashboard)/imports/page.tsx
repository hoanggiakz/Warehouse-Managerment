import { getImportReceipts } from '@/app/actions/imports';
import { getWarehouses } from '@/app/actions/warehouses';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { ImportsClient } from './client';
import { hasPermission } from '@/lib/rbac/permissions';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string; warehouseId?: string };
}) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_VIEW);
  
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const warehouseId = searchParams.warehouseId || '';

  const [{ data, total, totalPages }, warehousesRes] = await Promise.all([
    getImportReceipts(page, 20, search, status, warehouseId),
    getWarehouses(1, 100)
  ]);

  const warehouses = warehousesRes.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Import Receipts</h2>
        <p className="text-muted-foreground">
          Manage inbound stock shipments from suppliers.
        </p>
      </div>
      
      <ImportsClient 
        initialData={data} 
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        status={status}
        warehouseId={warehouseId}
        warehouses={warehouses}
        permissions={{
          create: hasPermission(session.permissions, PERMISSIONS.IMPORTS_CREATE)
        }}
      />
    </div>
  );
}
