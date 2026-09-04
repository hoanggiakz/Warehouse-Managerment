import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getQualityCheckById } from '@/app/actions/quality-checks';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { QualityCheckDetailClient } from './client';

export const dynamic = 'force-dynamic';

export default async function QualityCheckDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requirePermission(PERMISSIONS.QUALITY_CHECK_VIEW);
  const id = Number(params.id);

  if (isNaN(id)) {
    notFound();
  }

  const qualityCheck = await getQualityCheckById(id);
  if (!qualityCheck) {
    notFound();
  }

  // Fetch current live stock for warehouse context reference
  let currentStock = 0;
  if (qualityCheck.warehouseId) {
    const inv = await prisma.inventory.findUnique({
      where: {
        partId_warehouseId: {
          partId: qualityCheck.partId,
          warehouseId: qualityCheck.warehouseId,
        },
      },
    });
    currentStock = inv?.quantity ?? 0;
  }

  return (
    <QualityCheckDetailClient
      qualityCheck={qualityCheck}
      currentStock={currentStock}
      permissions={{
        start: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_START),
        recordDefect: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_RECORD_DEFECT),
        complete: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_COMPLETE),
        adjust: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_ADJUST),
        cancel: hasPermission(session.permissions, PERMISSIONS.QUALITY_CHECK_CANCEL),
      }}
    />
  );
}
