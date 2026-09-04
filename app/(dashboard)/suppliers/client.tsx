'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SupplierDialog } from './supplier-dialog';
import { deleteSupplier } from '@/app/actions/suppliers';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SuppliersClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  permissions: { create: boolean, update: boolean, delete: boolean };
}

export function SuppliersClient({ initialData, total, page, totalPages, search, status, permissions }: SuppliersClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  
  const [searchValue, setSearchValue] = useState(search);
  const [statusValue, setStatusValue] = useState(status);
  
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, statusValue, 1);
  };

  const updateFilters = (s: string, st: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (st && st !== 'ALL') params.set('status', st);
    if (p > 1) params.set('page', p.toString());
    
    router.push(`/suppliers?${params.toString()}`);
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier? If there are related records, it will be blocked. Consider deactivating instead.')) return;
    
    const res = await deleteSupplier(id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Supplier deleted successfully');
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search suppliers..." 
              className="pl-8" 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Select value={statusValue || 'ALL'} onValueChange={(val) => {
            setStatusValue(val);
            updateFilters(searchValue, val, 1);
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>

        {permissions.create && (
          <Button onClick={handleCreate} className="bg-[#1E40AF] hover:bg-blue-900 text-white gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            Add Supplier
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactName || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{supplier.email || '-'}</span>
                      <span className="text-muted-foreground">{supplier.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>{supplier.rating} / 5</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === 'ACTIVE' ? 'default' : 'secondary'} className={supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                      {supplier.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {permissions.update && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                          <Edit2 className="size-4 text-muted-foreground" />
                        </Button>
                      )}
                      {permissions.delete && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                          <Trash2 className="size-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} suppliers
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page <= 1}
              onClick={() => updateFilters(searchValue, statusValue, page - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilters(searchValue, statusValue, page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </>
  );
}
