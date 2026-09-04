import { Suspense } from 'react';
import { getAdminDashboardMetrics } from '@/app/actions/admin';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './client';

export const metadata = {
  title: 'Administration Dashboard | Maluzen Warehouse',
  description: 'User, Role and System Security Administration Overview',
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const metrics = await getAdminDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Administration Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor system users, role allocations, account lifecycles, and security audit activity.
        </p>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading metrics...</div>}>
        <AdminDashboardClient metrics={metrics} userRole={session.role} />
      </Suspense>
    </div>
  );
}
