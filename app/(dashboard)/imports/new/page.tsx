import { getSuppliers } from '@/app/actions/suppliers';
import { getWarehouses } from '@/app/actions/warehouses';
import { getParts } from '@/app/actions/parts';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { ImportForm } from './import-form';

export const dynamic = 'force-dynamic';

export default async function NewImportReceiptPage() {
  await requirePermission(PERMISSIONS.IMPORTS_CREATE);

  // Fetch all required data for the form dropdowns
  const [suppliersRes, warehousesRes, partsRes] = await Promise.all([
    getSuppliers(1, 1000), // In production, these should be searchable endpoints
    getWarehouses(1, 1000, '', 'ACTIVE'),
    getParts(1, 5000), // Get all parts for the part selector
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Import Receipt</h2>
        <p className="text-muted-foreground">
          Record inbound stock from a supplier. Save as draft or submit for processing.
        </p>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-6">
        <ImportForm 
          suppliers={suppliersRes.data || []}
          warehouses={warehousesRes.data || []}
          parts={partsRes.data || []}
        />
      </div>
    </div>
  );
}
