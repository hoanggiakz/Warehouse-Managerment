'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changeWarehouseStatus } from '@/app/actions/warehouses';
import { toast } from 'sonner';

import { Plus, Edit2, Ban, Search, MapPin, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface WarehousesClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  permissions: { create: boolean, update: boolean, delete: boolean };
}

export function WarehousesClient({ 
  initialData, total, page, totalPages, search, status, permissions 
}: WarehousesClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, status);
  };

  const updateFilters = (newSearch: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);
    
    router.push(`/warehouses?${params.toString()}`);
  };

  const handleDisable = async (id: number) => {
    if (!confirm('Are you sure you want to disable this warehouse? Transactions will be blocked.')) return;
    
    setLoading(true);
    const res = await changeWarehouseStatus(id, 'INACTIVE');
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Warehouse disabled successfully');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search code or name..."
              className="pl-8 bg-white"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <Select 
            value={status || 'ALL'} 
            onValueChange={(val) => updateFilters(searchValue, val)}
          >
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>

        {permissions.create && (
          <Link href="/warehouses/new" className="w-full sm:w-auto">
            <Button className="bg-[#1E40AF] hover:bg-blue-900 text-white gap-2 w-full">
              <Plus className="size-4" />
              Add Warehouse
            </Button>
          </Link>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code & Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Occupancy / Capacity</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No warehouses found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((warehouse) => {
                const occupancyPercent = warehouse.capacity > 0 
                  ? Math.min(100, Math.round((warehouse.currentOccupancy / warehouse.capacity) * 100))
                  : 0;
                  
                const isOverCapacity = warehouse.currentOccupancy > warehouse.capacity;

                return (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div className="font-medium text-[#1E40AF]">{warehouse.code}</div>
                      <div className="text-sm text-muted-foreground">{warehouse.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm text-muted-foreground max-w-[200px] truncate">
                        <MapPin className="size-3 mr-1 flex-shrink-0" />
                        <span className="truncate" title={warehouse.address || 'No address'}>
                          {warehouse.address || '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 min-w-[150px]">
                        <div className="flex justify-between text-xs">
                          <span className={isOverCapacity ? 'text-red-500 font-medium' : ''}>
                            {warehouse.currentOccupancy.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">/ {warehouse.capacity.toLocaleString()}</span>
                        </div>
                        <div className={`h-2 w-full overflow-hidden rounded-full ${isOverCapacity ? 'bg-red-100' : 'bg-secondary'}`}>
                          <div 
                            className={`h-full flex-1 transition-all ${isOverCapacity ? 'bg-red-500' : occupancyPercent > 80 ? 'bg-amber-500' : 'bg-green-500'}`} 
                            style={{ transform: `translateX(-${100 - occupancyPercent}%)` }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-right">{occupancyPercent}%</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Archive className="size-3 mr-1 text-muted-foreground" />
                        {warehouse._count.inventories} SKUs
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={
                          warehouse.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : warehouse.status === 'INACTIVE'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-amber-100 text-amber-800'
                        }
                      >
                        {warehouse.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {permissions.update && (
                          <Link href={`/warehouses/${warehouse.id}/edit`}>
                            <Button variant="ghost" size="icon" title="Edit Warehouse">
                              <Edit2 className="size-4 text-muted-foreground" />
                            </Button>
                          </Link>
                        )}
                        {permissions.delete && warehouse.status === 'ACTIVE' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDisable(warehouse.id)}
                            disabled={loading}
                            title="Disable Warehouse"
                          >
                            <Ban className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set('search', search);
              if (status && status !== 'ALL') params.set('status', status);
              params.set('page', (page - 1).toString());
              router.push(`/warehouses?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <div className="flex items-center px-4 text-sm font-medium">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            disabled={page === totalPages}
            onClick={() => {
              const params = new URLSearchParams();
              if (search) params.set('search', search);
              if (status && status !== 'ALL') params.set('status', status);
              params.set('page', (page + 1).toString());
              router.push(`/warehouses?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
