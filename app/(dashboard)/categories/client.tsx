'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Folder, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CategoryDialog } from './category-dialog';
import { deleteCategory } from '@/app/actions/categories';
import { toast } from 'sonner';

import { useRouter } from 'next/navigation';

export function CategoriesClient({ initialCategories, permissions }: { initialCategories: any[], permissions: { create: boolean, update: boolean, delete: boolean } }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const router = useRouter();

  const handleEdit = (category: any) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    const res = await deleteCategory(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Category deleted successfully');
      router.refresh();
    }
  };

  // Build tree
  const rootCategories = initialCategories.filter(c => !c.parentId);

  const renderCategory = (category: any, level: number = 0) => {
    const children = initialCategories.filter(c => c.parentId === category.id);

    return (
      <div key={category.id} className="flex flex-col">
        <div 
          className="flex items-center justify-between py-3 px-4 border-b last:border-0 hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          <div className="flex items-center gap-3">
            {level > 0 ? (
              <CornerDownRight className="size-4 text-muted-foreground" />
            ) : (
              <Folder className="size-5 text-[#1E40AF]" />
            )}
            <div>
              <p className="font-medium text-sm text-foreground">{category.name}</p>
              {category.description && (
                <p className="text-xs text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant={category.status === 'ACTIVE' ? 'default' : 'secondary'} className={category.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
              {category.status}
            </Badge>
            <div className="text-xs text-muted-foreground min-w-[80px] text-right">
              {category._count?.parts ?? 0} parts
            </div>
            
            <div className="flex items-center gap-1">
              {permissions.update && (
                <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                  <Edit2 className="size-4 text-muted-foreground" />
                </Button>
              )}
              {permissions.delete && (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {children.map(child => renderCategory(child, level + 1))}
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        {permissions.create && (
          <Button onClick={handleCreate} className="bg-[#1E40AF] hover:bg-blue-900 text-white gap-2">
            <Plus className="size-4" />
            Add Category
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {rootCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No categories found. Create one to get started.
            </div>
          ) : (
            <div className="flex flex-col">
              {rootCategories.map(cat => renderCategory(cat))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        categories={initialCategories}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
