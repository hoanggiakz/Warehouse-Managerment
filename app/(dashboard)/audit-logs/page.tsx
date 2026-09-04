import { Suspense } from 'react';
import { getAuditLogs, getAuditLogFilterOptions } from '@/app/actions/audit-logs';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AuditLogsClient } from './client';

export const metadata = {
  title: 'Audit Logs | Maluzen Warehouse',
  description: 'Immutable system audit trail and compliance activity viewer',
};

interface AuditLogsPageProps {
  searchParams?: {
    page?: string;
    search?: string;
    action?: string;
    entity?: string;
    startDate?: string;
    endDate?: string;
  };
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams?.search || '';
  const action = searchParams?.action || '';
  const entity = searchParams?.entity || '';
  const startDate = searchParams?.startDate || '';
  const endDate = searchParams?.endDate || '';

  const [logsResult, filterOptions] = await Promise.all([
    getAuditLogs({
      page,
      limit: 25,
      search,
      action: action || undefined,
      entity: entity || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    getAuditLogFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading audit trail...</div>}>
        <AuditLogsClient
          initialData={logsResult}
          filterOptions={filterOptions}
          searchParams={{ page, search, action, entity, startDate, endDate }}
        />
      </Suspense>
    </div>
  );
}
