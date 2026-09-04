import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { hasPermission, PERMISSIONS } from '@/lib/rbac/permissions';
import { ReportsClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  if (!hasPermission(session.permissions, PERMISSIONS.REPORTS_VIEW)) {
    redirect('/dashboard');
  }

  const [warehouses, categories] = await Promise.all([
    prisma.warehouse.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const canExport = hasPermission(session.permissions, PERMISSIONS.REPORTS_EXPORT);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reports & Operational Analytics</h2>
        <p className="text-sm text-gray-500">
          Real-time visibility into warehouse throughput, inventory health, quality control, and supply chain fulfillment.
        </p>
      </div>

      <ReportsClient
        warehouses={warehouses}
        categories={categories}
        canExport={canExport}
        userPermissions={session.permissions}
      />
    </div>
  );
}
