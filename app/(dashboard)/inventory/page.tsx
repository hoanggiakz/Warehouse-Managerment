import { getInventory } from '@/app/actions/inventory';
import { getWarehouses } from '@/app/actions/warehouses';
import { InventoryClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getSession();
  
  if (!session || !hasPermission(session.permissions, PERMISSIONS.INVENTORY_VIEW)) {
    redirect('/dashboard');
  }

  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';
  const warehouseId = searchParams.warehouseId || '';

  const [inventoryResult, warehousesResult] = await Promise.all([
    getInventory(page, 20, search, warehouseId, status),
    getWarehouses(1, 100, '', 'ACTIVE') // Fetch active warehouses for the filter
  ]);

  const permissions = {
    adjust: hasPermission(session.permissions, PERMISSIONS.INVENTORY_ADJUST),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
        <p className="text-muted-foreground">
          Track stock levels, locations, and adjust inventory across all warehouses.
        </p>
      </div>
      <InventoryClient 
        initialData={inventoryResult.data} 
        total={inventoryResult.total} 
        page={page} 
        totalPages={inventoryResult.totalPages} 
        search={search}
        status={status}
        warehouseId={warehouseId}
        warehouses={warehousesResult.data}
        permissions={permissions}
      />
    </div>
  );
}
