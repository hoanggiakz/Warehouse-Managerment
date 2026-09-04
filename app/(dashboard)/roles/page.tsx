import { Suspense } from 'react';
import { getRoles } from '@/app/actions/roles';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { RolesClient } from './client';

export const metadata = {
  title: 'Roles & Permissions | Maluzen Warehouse',
  description: 'Manage RBAC templates and permission assignments',
};

export default async function RolesPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const roles = await getRoles();

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading roles...</div>}>
        <RolesClient roles={roles} currentUserRole={session.role} />
      </Suspense>
    </div>
  );
}
