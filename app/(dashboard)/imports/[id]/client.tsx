'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeImportReceipt, cancelImportReceipt, submitImportReceipt } from '@/app/actions/imports';
import { format } from 'date-fns';

import { 
  Building2, PackageCheck, AlertCircle, FileText, Calendar, 
  User, CheckCircle2, XCircle, ArrowLeft, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface ImportDetailClientProps {
  receipt: any;
  permissions: { complete: boolean; cancel: boolean };
}

export function ImportDetailClient({ receipt, permissions }: ImportDetailClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: 'submit' | 'complete' | 'cancel') => {
    setIsProcessing(true);
    let res;
    
    try {
      if (action === 'submit') res = await submitImportReceipt(receipt.id);
      else if (action === 'complete') res = await completeImportReceipt(receipt.id);
      else if (action === 'cancel') res = await cancelImportReceipt(receipt.id);
      
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Receipt ${action}d successfully`);
        router.refresh();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="outline" className="text-muted-foreground border-dashed px-3 py-1">Draft</Badge>;
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 px-3 py-1"><AlertCircle className="size-4 mr-1.5" /> Pending</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 px-3 py-1"><PackageCheck className="size-4 mr-1.5" /> Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="px-3 py-1">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{receipt.receiptNumber}</h2>
          <p className="text-muted-foreground">
            Import Receipt Details
          </p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(receipt.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-sm text-muted-foreground mb-1 flex items-center">
            <Building2 className="size-4 mr-1.5" /> Supplier
          </div>
          <div className="font-medium">{receipt.supplier.name}</div>
        </div>
        
        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-sm text-muted-foreground mb-1 flex items-center">
            <MapPin className="size-4 mr-1.5" /> Destination Warehouse
          </div>
          <div className="font-medium">{receipt.warehouse.name} ({receipt.warehouse.code})</div>
        </div>

        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-sm text-muted-foreground mb-1 flex items-center">
            <Calendar className="size-4 mr-1.5" /> Import Date
          </div>
          <div className="font-medium">{format(new Date(receipt.importDate), 'PPP')}</div>
        </div>

        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-sm text-muted-foreground mb-1 flex items-center">
            <User className="size-4 mr-1.5" /> Created By
          </div>
          <div className="font-medium">{receipt.creator.fullName}</div>
        </div>
      </div>

      {(receipt.poNumber || receipt.deliveryNote || receipt.notes) && (
        <div className="p-4 border rounded-md bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {receipt.poNumber && (
              <div>
                <span className="text-sm text-muted-foreground block">PO Number</span>
                <span className="font-mono">{receipt.poNumber}</span>
              </div>
            )}
            {receipt.deliveryNote && (
              <div>
                <span className="text-sm text-muted-foreground block">Delivery Note</span>
                <span className="font-mono">{receipt.deliveryNote}</span>
              </div>
            )}
            {receipt.notes && (
              <div className="md:col-span-3">
                <span className="text-sm text-muted-foreground block">Notes</span>
                <p className="text-sm">{receipt.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border rounded-md bg-white overflow-hidden shadow-sm">
        <div className="bg-muted px-4 py-3 border-b flex items-center text-sm font-medium">
          <FileText className="size-4 mr-2" />
          Line Items ({receipt.details.length})
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.details.map((detail: any) => (
                <TableRow key={detail.id}>
                  <TableCell className="font-mono text-xs">{detail.part.sku}</TableCell>
                  <TableCell className="font-medium">{detail.part.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{detail.part.category.name}</TableCell>
                  <TableCell className="text-right font-semibold">{detail.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">¥{Number(detail.unitPrice).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium bg-muted/20">
                    ¥{Number(detail.totalPrice).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {detail.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="bg-muted/50 px-6 py-4 border-t flex justify-end items-center gap-4">
          <span className="text-muted-foreground font-medium text-sm">Receipt Grand Total:</span>
          <span className="text-2xl font-bold text-[#1E40AF]">¥{Number(receipt.totalAmount).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {receipt.status === 'DRAFT' && permissions.complete && (
          <Button 
            variant="secondary" 
            onClick={() => handleAction('submit')}
            disabled={isProcessing}
            className="gap-2"
          >
            <Send className="size-4" /> Submit for Completion
          </Button>
        )}

        {(receipt.status === 'DRAFT' || receipt.status === 'PENDING') && permissions.cancel && (
          <Button 
            variant="destructive" 
            onClick={() => {
              if (confirm('Are you sure you want to cancel this receipt? This action cannot be undone.')) {
                handleAction('cancel');
              }
            }}
            disabled={isProcessing}
            className="gap-2"
          >
            <XCircle className="size-4" /> Cancel Receipt
          </Button>
        )}

        {receipt.status === 'PENDING' && permissions.complete && (
          <Button 
            className="bg-green-600 hover:bg-green-700 gap-2"
            onClick={() => {
              if (confirm('Are you sure you want to complete this receipt? Inventory will be updated automatically.')) {
                handleAction('complete');
              }
            }}
            disabled={isProcessing}
          >
            <CheckCircle2 className="size-4" /> Complete & Update Inventory
          </Button>
        )}
      </div>
    </>
  );
}

// MapPin mock definition (not imported from lucide-react above by mistake)
import { MapPin } from 'lucide-react';
