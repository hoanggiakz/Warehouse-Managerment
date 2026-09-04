import { getSuppliers } from '@/app/actions/suppliers';
import { SuppliersClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { page?: string; search?: string; status?: string };
}) {
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const search = searchParams.search || '';
  const status = searchParams.status || '';

  const [{ data: suppliers, total, totalPages }, session] = await Promise.all([
    getSuppliers(page, 20, search, status),
    getSession()
  ]);

  const permissions = {
    create: session ? hasPermission(session.permissions, 'suppliers:create') : false,
    update: session ? hasPermission(session.permissions, 'suppliers:update') : false,
    delete: session ? hasPermission(session.permissions, 'suppliers:delete') : false,
  };

  // Convert Decimal to string for safe serialization to Client Components
  const serializedSuppliers = suppliers.map(s => ({
    ...s,
    rating: s.rating.toString(),
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
        initialData={serializedSuppliers} 
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
