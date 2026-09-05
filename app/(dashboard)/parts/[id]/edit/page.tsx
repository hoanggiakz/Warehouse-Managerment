import { prisma } from '@/lib/prisma';
import { PartForm } from '../../part-form';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditPartPage({ params }: { params: { id: string } }) {
  const [part, categories, suppliers] = await Promise.all([
    prisma.part.findUnique({ where: { id: parseInt(params.id, 10) } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' } })
  ]);

  if (!part) {
    notFound();
  }

  const serializedPart = {
    ...part,
    purchasePrice: part.purchasePrice != null ? part.purchasePrice.toString() : '0.00',
    salePrice: part.salePrice != null ? part.salePrice.toString() : '0.00',
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Part: {part.sku}</h1>
        <p className="text-sm text-muted-foreground">
          Update the part master record.
        </p>
      </div>
      
      <PartForm initialData={serializedPart} categories={categories} suppliers={suppliers} />
    </div>
  );
}
