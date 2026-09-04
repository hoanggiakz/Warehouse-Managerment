import { getWarehouses } from '@/app/actions/warehouses';
import { getParts } from '@/app/actions/parts';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { ExportForm } from './export-form';

export const dynamic = 'force-dynamic';

export default async function NewExportReceiptPage() {
  await requirePermission(PERMISSIONS.EXPORTS_CREATE);

  // Fetch active warehouses and registered parts
  const [warehousesRes, partsRes] = await Promise.all([
    getWarehouses(1, 1000, '', 'ACTIVE'),
    getParts(1, 5000),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create Export Receipt</h2>
        <p className="text-muted-foreground">
          Record outbound parts for assembly dispatch, branch transfer, or customer delivery.
        </p>
      </div>

      <div className="border rounded-lg bg-white shadow-sm p-6">
        <ExportForm
          warehouses={warehousesRes.data || []}
          parts={partsRes.data || []}
        />
      </div>
    </div>
  );
}
