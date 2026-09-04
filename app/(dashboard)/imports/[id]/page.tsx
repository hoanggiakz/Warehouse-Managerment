import { getImportReceipt } from '@/app/actions/imports';
import { requirePermission } from '@/lib/rbac/authorize';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { notFound } from 'next/navigation';
import { ImportDetailClient } from './client';
import { hasPermission } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export default async function ImportDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePermission(PERMISSIONS.IMPORTS_VIEW);
  
  const receipt = await getImportReceipt(Number(params.id));

  if (!receipt) {
    notFound();
  }

  const permissions = {
    complete: hasPermission(session.permissions, PERMISSIONS.IMPORTS_COMPLETE),
    cancel: hasPermission(session.permissions, PERMISSIONS.IMPORTS_CANCEL),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ImportDetailClient receipt={receipt as any} permissions={permissions} />
    </div>
  );
}
