import { getUserById } from '@/app/actions/users';
import { getRoles } from '@/app/actions/roles';
import { getSession } from '@/lib/auth/session';
import { notFound, redirect } from 'next/navigation';
import { UserDetailClient } from './client';

export const metadata = {
  title: 'User Details | Maluzen Warehouse',
  description: 'Detailed user identity, role, and activity history',
};

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    notFound();
  }

  try {
    const [user, roles] = await Promise.all([
      getUserById(userId),
      getRoles(),
    ]);

    return (
      <div className="space-y-6">
        <UserDetailClient
          user={user}
          roles={roles}
          currentUserRole={session.role}
          currentUserId={session.id}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
