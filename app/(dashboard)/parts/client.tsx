'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PartsClientProps {
  initialData: any[];
  categories: any[];
  suppliers: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  categoryId: string;
  supplierId: string;
  status: string;
  permissions: { create: boolean, update: boolean };
}

export function PartsClient({ 
  initialData, categories, suppliers, total, page, totalPages, 
  search, categoryId, supplierId, status, permissions
}: PartsClientProps) {
  
  const [searchValue, setSearchValue] = useState(search);
  const [catValue, setCatValue] = useState(categoryId);
  const [supValue, setSupValue] = useState(supplierId);
  const [statusValue, setStatusValue] = useState(status);
  
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, catValue, supValue, statusValue, 1);
  };

  const updateFilters = (s: string, c: string, sp: string, st: string, p: number) => {
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (c && c !== 'ALL') params.set('categoryId', c);
    if (sp && sp !== 'ALL') params.set('supplierId', sp);
    if (st && st !== 'ALL') params.set('status', st);
    if (p > 1) params.set('page', p.toString());
    
    router.push(`/parts?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKU, Name..." 
              className="pl-8" 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Select value={catValue || 'ALL'} onValueChange={setCatValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={supValue || 'ALL'} onValueChange={setSupValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Suppliers</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusValue || 'ALL'} onValueChange={setStatusValue}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
          
          {permissions.create && (
            <Link href="/parts/new" className="ml-auto">
              <Button className="bg-[#1E40AF] hover:bg-blue-900 text-white gap-2">
                <Plus className="size-4" />
                Add Part
              </Button>
            </Link>
          )}
        </form>
      </div>

      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name & Brand</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Price (Buy/Sell)</TableHead>
              <TableHead className="text-center">Stock Limit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                  No parts found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((part) => (
                <TableRow key={part.id}>
                  <TableCell className="font-mono text-sm">{part.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium">{part.name}</div>
                    <div className="text-xs text-muted-foreground">{part.brand}</div>
                  </TableCell>
                  <TableCell>{part.category.name}</TableCell>
                  <TableCell>{part.supplier.name}</TableCell>
                  <TableCell className="text-right">
                    <div>¥{Number(part.purchasePrice).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">¥{Number(part.salePrice).toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {part.minStock} - {part.maxStock} {part.unit}
                  </TableCell>
                  <TableCell>
                    <Badge variant={part.status === 'ACTIVE' ? 'default' : 'secondary'} className={part.status === 'ACTIVE' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                      {part.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {permissions.update && (
                      <Link href={`/parts/${part.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
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
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} parts
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={page <= 1}
              onClick={() => updateFilters(searchValue, catValue, supValue, statusValue, page - 1)}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilters(searchValue, catValue, supValue, statusValue, page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
