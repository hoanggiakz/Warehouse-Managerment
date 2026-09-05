import { getSuppliers } from '@/app/actions/suppliers';
import { SuppliersClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string };
}) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, 'suppliers:view')) {
    redirect('/dashboard');
  }

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';

  const { data: suppliers, total, totalPages } = await getSuppliers(page, 20, search, status);

  const permissions = {
    create: hasPermission(session.permissions, 'suppliers:create'),
    update: hasPermission(session.permissions, 'suppliers:update'),
    delete: hasPermission(session.permissions, 'suppliers:delete'),
  };

  // Convert Decimal to string for safe serialization to Client Components
  const serializedSuppliers = suppliers.map(s => ({
    ...s,
    rating: s.rating != null ? s.rating.toString() : '5.0',
    createdAt: s.createdAt ? s.createdAt.toISOString() : null,
    updatedAt: s.updatedAt ? s.updatedAt.toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <p className="text-sm text-muted-foreground">
          Manage suppliers and vendors.
        </p>
      </div>
      
      <SuppliersClient 
        initialData={serializedSuppliers as any} 
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
