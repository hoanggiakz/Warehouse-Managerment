import { getRoles } from '@/app/actions/roles';
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { UserForm } from './user-form';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Create User | Maluzen Warehouse',
  description: 'Add a new user account to the system',
};

export default async function NewUserPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const roles = await getRoles();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/users">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="size-4" /> Back to Users
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create New User</h1>
        <p className="text-sm text-gray-500 mt-1">
          Register an employee account, assign their operational role, and provision initial credentials.
        </p>
      </div>

      <UserForm roles={roles} currentUserRole={session.role} />
    </div>
  );
}
