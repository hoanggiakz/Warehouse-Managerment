import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDashboardMetrics } from '@/app/actions/reports';
import { DashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const metrics = await getDashboardMetrics();

  return (
    <DashboardClient
      metrics={metrics}
      userName={session.fullName || session.username || 'User'}
    />
  );
}
