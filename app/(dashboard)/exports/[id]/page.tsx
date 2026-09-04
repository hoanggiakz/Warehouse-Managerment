import { getExportReceiptById, getWarehouseStockForExport } from '@/app/actions/exports';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { notFound } from 'next/navigation';
import { ExportDetailClient } from './client';

export const dynamic = 'force-dynamic';

export default async function ExportDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePermission(PERMISSIONS.EXPORTS_VIEW);

  const receipt = await getExportReceiptById(Number(params.id));
  if (!receipt) {
    notFound();
  }

  // Fetch live inventory for this warehouse to display current available stock next to requested stock
  const currentStockMap = await getWarehouseStockForExport(receipt.warehouseId);

  const permissions = {
    complete: hasPermission(session.permissions, PERMISSIONS.EXPORTS_COMPLETE),
    cancel: hasPermission(session.permissions, PERMISSIONS.EXPORTS_CANCEL),
    create: hasPermission(session.permissions, PERMISSIONS.EXPORTS_CREATE),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ExportDetailClient
        receipt={receipt as any}
        currentStockMap={currentStockMap}
        permissions={permissions}
      />
    </div>
  );
}
