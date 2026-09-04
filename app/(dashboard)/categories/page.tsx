import { prisma } from '@/lib/prisma';
import { CategoriesClient } from './client';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const [categories, session] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' }
    }),
    getSession()
  ]);

  const permissions = {
    create: session ? hasPermission(session.permissions, 'categories:create') : false,
    update: session ? hasPermission(session.permissions, 'categories:update') : false,
    delete: session ? hasPermission(session.permissions, 'categories:delete') : false,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Manage product categories and sub-categories.
        </p>
      </div>
      <CategoriesClient 
        initialCategories={categories} 
        permissions={permissions}
      />
    </div>
  );
}
