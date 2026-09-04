import { notFound } from 'next/navigation';
import { getStockCheckById } from '@/app/actions/stock-checks';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS, hasPermission } from '@/lib/rbac/permissions';
import { StockCheckDetailClient } from './client';

export const dynamic = 'force-dynamic';

export default async function StockCheckDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requirePermission(PERMISSIONS.STOCK_CHECK_VIEW);
  const id = Number(params.id);

  if (isNaN(id)) {
    notFound();
  }

  const stockCheck = await getStockCheckById(id);
  if (!stockCheck) {
    notFound();
  }

  return (
    <StockCheckDetailClient
      stockCheck={stockCheck}
      permissions={{
        count: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_COUNT),
        complete: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_COMPLETE),
        adjust: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_ADJUST),
        cancel: hasPermission(session.permissions, PERMISSIONS.STOCK_CHECK_CANCEL),
      }}
    />
  );
}
