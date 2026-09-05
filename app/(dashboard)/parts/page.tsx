import { getParts } from '@/app/actions/parts';
import { prisma } from '@/lib/prisma';
import { PartsClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export default async function PartsPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; categoryId?: string; supplierId?: string; status?: string };
}) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const search = searchParams.search || '';
  const categoryId = searchParams.categoryId || '';
  const supplierId = searchParams.supplierId || '';
  const status = searchParams.status || '';

  const [{ data: parts, total, totalPages }, categories, suppliers, session] = await Promise.all([
    getParts(page, 20, search, categoryId, supplierId, status),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } }),
    getSession()
  ]);

  const permissions = {
    create: session ? hasPermission(session.permissions, 'parts:create') : false,
    update: session ? hasPermission(session.permissions, 'parts:update') : false,
  };

  // Serialize Decimal values for Client Component
  const serializedParts = parts.map(p => ({
    ...p,
    purchasePrice: p.purchasePrice != null ? p.purchasePrice.toString() : '0.00',
    salePrice: p.salePrice != null ? p.salePrice.toString() : '0.00',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parts Master</h1>
        <p className="text-sm text-muted-foreground">
          Manage automotive parts, wheels, tires, and accessories.
        </p>
      </div>
      
      <PartsClient 
        initialData={serializedParts} 
        categories={categories}
        suppliers={suppliers}
        total={total} 
        page={page} 
        totalPages={totalPages} 
        search={search}
        categoryId={categoryId}
        supplierId={supplierId}
        status={status}
        permissions={permissions}
      />
    </div>
  );
}
