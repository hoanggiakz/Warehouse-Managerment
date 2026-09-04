import { prisma } from '@/lib/prisma';
import { PartForm } from '../part-form';

export const dynamic = 'force-dynamic';

export default async function NewPartPage() {
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add New Part</h1>
        <p className="text-sm text-muted-foreground">
          Create a new part master record.
        </p>
      </div>
      
      <PartForm categories={categories} suppliers={suppliers} />
    </div>
  );
}
