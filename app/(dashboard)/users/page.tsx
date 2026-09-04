import { Suspense } from 'react';
import { getUsers } from '@/app/actions/users';
import { getRoles } from '@/app/actions/roles';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { UsersClient } from './client';

export const metadata = {
  title: 'User Management | Maluzen Warehouse',
  description: 'Manage accounts, role assignments, and statuses',
};

interface UsersPageProps {
  searchParams?: {
    page?: string;
    search?: string;
    roleId?: string;
    status?: string;
  };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams?.search || '';
  const roleId = searchParams?.roleId ? parseInt(searchParams.roleId, 10) : undefined;
  const status = (searchParams?.status as 'ALL' | 'ACTIVE' | 'INACTIVE') || 'ALL';

  const [usersResult, roles] = await Promise.all([
    getUsers({ page, limit: 20, search, roleId, status }),
    getRoles(),
  ]);

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading users...</div>}>
        <UsersClient
          initialData={usersResult}
          roles={roles}
          currentUserRole={session.role}
          currentUserId={session.id}
          searchParams={{ page, search, roleId, status }}
        />
      </Suspense>
    </div>
  );
}
