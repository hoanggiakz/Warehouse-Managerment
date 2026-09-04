import { getWarehouses } from '@/app/actions/warehouses';
import { WarehousesClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WarehousesPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const session = await getSession();
  
  if (!session || !hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_VIEW)) {
    redirect('/dashboard');
  }

  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';

  const { data: warehouses, total, totalPages } = await getWarehouses(page, 20, search, status);

  const permissions = {
    create: hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_CREATE),
    update: hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_UPDATE),
    delete: hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_DELETE),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Warehouses</h2>
        <p className="text-muted-foreground">
          Manage warehouse locations, capacity and operational status.
        </p>
      </div>
      <WarehousesClient 
        initialData={warehouses} 
        total={total} 
        page={page} 
        totalPages={totalPages} 
        search={search}
        status={status}
        permissions={permissions}
      />
    </div>
  );
}
