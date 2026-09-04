import { WarehouseForm } from '../warehouse-form';
import { getSession } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewWarehousePage() {
  const session = await getSession();
  
  if (!session || !hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_CREATE)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Add Warehouse</h2>
        <p className="text-muted-foreground">
          Create a new physical or logical warehouse location.
        </p>
      </div>
      <WarehouseForm />
    </div>
  );
}
