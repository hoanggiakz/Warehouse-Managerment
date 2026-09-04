'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { format } from 'date-fns';

import { Search, MapPin, Calculator, AlertTriangle, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface InventoryClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  warehouseId: string;
  warehouses: any[];
  permissions: { adjust: boolean };
}

export function InventoryClient({ 
  initialData, total, page, totalPages, search, status, warehouseId, warehouses, permissions 
}: InventoryClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);
  const [adjustDialogItem, setAdjustDialogItem] = useState<any | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, warehouseId, status);
  };

  const updateFilters = (newSearch: string, newWarehouseId: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newWarehouseId && newWarehouseId !== 'ALL') params.set('warehouseId', newWarehouseId);
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);
    
    router.push(`/inventory?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle2 className="size-3 mr-1" /> Normal</Badge>;
      case 'LOW':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800"><AlertTriangle className="size-3 mr-1" /> Low Stock</Badge>;
      case 'OUT':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><AlertCircle className="size-3 mr-1" /> Out of Stock</Badge>;
      case 'OVER':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800"><TrendingUp className="size-3 mr-1" /> Overstock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search SKU or Name..."
              className="pl-8 bg-white"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          
          <Select 
            value={warehouseId || 'ALL'} 
            onValueChange={(val) => updateFilters(searchValue, val, status)}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Warehouses</SelectItem>
              {warehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id.toString()}>{wh.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={status || 'ALL'} 
            onValueChange={(val) => updateFilters(searchValue, warehouseId, val)}
          >
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LOW">Low Stock</SelectItem>
              <SelectItem value="OUT">Out of Stock</SelectItem>
              <SelectItem value="OVER">Overstock</SelectItem>
            </SelectContent>
          </Select>
          
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
      </div>

      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU & Part</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Min/Max</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No inventory records found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-mono text-sm text-[#1E40AF]">{item.part.sku}</div>
                    <div className="text-sm font-medium">{item.part.name}</div>
                    <div className="text-xs text-muted-foreground">{item.part.category.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.warehouse.code}</div>
                    <div className="text-xs text-muted-foreground">{item.warehouse.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm font-mono">
                      <MapPin className="size-3 mr-1 text-muted-foreground" />
                      {item.location || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-lg">{item.quantity.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">{item.part.unit}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    <div>Min: {item.minStock}</div>
                    <div>Max: {item.maxStock}</div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(item.lastUpdated), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    {permissions.adjust && item.warehouse.status === 'ACTIVE' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAdjustDialogItem(item)}
                        className="gap-1"
                      >
                        <Calculator className="size-3.5" />
                        Adjust
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
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
              if (warehouseId && warehouseId !== 'ALL') params.set('warehouseId', warehouseId);
              if (status && status !== 'ALL') params.set('status', status);
              params.set('page', (page - 1).toString());
              router.push(`/inventory?${params.toString()}`);
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
              if (warehouseId && warehouseId !== 'ALL') params.set('warehouseId', warehouseId);
              if (status && status !== 'ALL') params.set('status', status);
              params.set('page', (page + 1).toString());
              router.push(`/inventory?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}

      <AdjustStockDialog 
        inventory={adjustDialogItem} 
        open={!!adjustDialogItem} 
        onOpenChange={(open) => !open && setAdjustDialogItem(null)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
