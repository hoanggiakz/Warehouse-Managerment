import { WarehouseForm } from '../../warehouse-form';
import { getSession } from '@/lib/auth/session';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function EditWarehousePage({ params }: { params: { id: string } }) {
  const session = await getSession();
  
  if (!session || !hasPermission(session.permissions, PERMISSIONS.WAREHOUSES_UPDATE)) {
    redirect('/dashboard');
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: parseInt(params.id, 10) }
  });

  if (!warehouse) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Warehouse</h2>
        <p className="text-muted-foreground">
          Update information and capacity for {warehouse.name}.
        </p>
      </div>
      <WarehouseForm initialData={warehouse} />
    </div>
  );
}
