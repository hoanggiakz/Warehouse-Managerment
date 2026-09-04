import { getRoleById } from '@/app/actions/roles';
import { getSession } from '@/lib/auth/session';
import { notFound, redirect } from 'next/navigation';
import { RolePermissionMatrix } from './role-permission-matrix';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Role Permissions Matrix | Maluzen Warehouse',
  description: 'View and manage granular role permissions',
};

interface RoleDetailPageProps {
  params: {
    id: string;
  };
}

export default async function RoleDetailPage({ params }: RoleDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const roleId = parseInt(params.id, 10);
  if (isNaN(roleId)) {
    notFound();
  }

  try {
    const role = await getRoleById(roleId);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/roles">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="size-4" /> Back to Roles
            </Button>
          </Link>
        </div>

        <RolePermissionMatrix
          role={role}
          currentUserRole={session.role}
          currentUserId={session.id}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
