import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';
import { ReactNode } from 'react';

interface CanProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Server Component for conditional rendering based on RBAC permissions.
 * Usage: <Can permission="parts:create"><Button>Create</Button></Can>
 */
export async function Can({ permission, children, fallback = null }: CanProps) {
  const session = await getSession();
  
  if (!session || !hasPermission(session.permissions, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
