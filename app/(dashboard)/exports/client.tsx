'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import { Search, Plus, Building2, PackageCheck, AlertCircle, FileText, ChevronRight, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ExportsClientProps {
  initialData: any[];
  total: number;
  page: number;
  totalPages: number;
  search: string;
  status: string;
  warehouseId: string;
  warehouses: any[];
  permissions: { create: boolean };
}

export function ExportsClient({
  initialData,
  total,
  page,
  totalPages,
  search,
  status,
  warehouseId,
  warehouses,
  permissions,
}: ExportsClientProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(searchValue, warehouseId, status);
  };

  const updateFilters = (newSearch: string, newWarehouseId: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set('search', newSearch);
    if (newWarehouseId && newWarehouseId !== 'ALL') params.set('warehouseId', newWarehouseId);
    if (newStatus && newStatus !== 'ALL') params.set('status', newStatus);

    router.push(`/exports?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-muted-foreground border-dashed">Draft</Badge>;
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            <AlertCircle className="size-3 mr-1" /> Pending
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <PackageCheck className="size-3 mr-1" /> Completed
          </Badge>
        );
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
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
              placeholder="Search receipt #, department or reason..."
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
                <SelectItem key={wh.id} value={wh.id.toString()}>
                  {wh.code} - {wh.name}
                </SelectItem>
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
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit" variant="secondary">Filter</Button>
        </form>

        {permissions.create && (
          <Link href="/exports/new">
            <Button className="bg-[#1E40AF] hover:bg-[#1E40AF]/90">
              <Plus className="mr-2 h-4 w-4" /> New Export Receipt
            </Button>
          </Link>
        )}
      </div>

      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt #</TableHead>
              <TableHead>Source Warehouse</TableHead>
              <TableHead>Department / Purpose</TableHead>
              <TableHead>Export Date</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  <Truck className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  No export receipts found.
                </TableCell>
              </TableRow>
            ) : (
              initialData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-mono text-sm font-semibold">{item.receiptNumber}</div>
                    <div className="text-xs text-muted-foreground flex items-center mt-1">
                      <FileText className="size-3 mr-1" />
                      {item._count?.details ?? 0} items
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm font-medium">
                      <Building2 className="size-3.5 mr-1 text-muted-foreground" />
                      {item.warehouse.code}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.warehouse.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {item.requestDepartment || 'Standard Dispatch'}
                    </div>
                    {item.reason && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs">
                        {item.reason}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(item.exportDate), 'MMM d, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium font-mono">
                    ¥{Number(item.totalAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.creator.fullName}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/exports/${item.id}`}>
                      <Button variant="ghost" size="sm">
                        View <ChevronRight className="ml-1 size-4" />
                      </Button>
                    </Link>
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
              router.push(`/exports?${params.toString()}`);
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
              router.push(`/exports?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
