'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  completeExportReceipt,
  cancelExportReceipt,
  submitExportReceipt,
} from '@/app/actions/exports';

import {
  Building2,
  PackageCheck,
  AlertCircle,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Send,
  Truck,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ExportDetailClientProps {
  receipt: any;
  currentStockMap: Record<number, { quantity: number; location: string | null }>;
  permissions: {
    complete: boolean;
    cancel: boolean;
    create: boolean;
  };
}

export function ExportDetailClient({
  receipt,
  currentStockMap,
  permissions,
}: ExportDetailClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  // Check if any items currently exceed available stock
  const hasInsufficientStock = receipt.details.some((detail: any) => {
    const liveQty = currentStockMap[detail.partId]?.quantity ?? 0;
    return detail.quantity > liveQty;
  });

  const handleAction = async (action: 'submit' | 'complete' | 'cancel') => {
    setIsProcessing(true);
    let res;

    try {
      if (action === 'submit') res = await submitExportReceipt(receipt.id);
      else if (action === 'complete') res = await completeExportReceipt(receipt.id);
      else if (action === 'cancel') res = await cancelExportReceipt(receipt.id);

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          action === 'complete'
            ? 'Phiếu xuất đã hoàn tất thành công. Tồn kho và sức chứa kho đã được cập nhật!'
            : action === 'submit'
            ? 'Đã nộp phiếu xuất để duyệt (PENDING)'
            : 'Phiếu xuất đã bị hủy.'
        );
        router.refresh();
      }
    } catch {
      toast.error('Có lỗi xảy ra trong quá trình xử lý');
    } finally {
      setIsProcessing(false);
      setConfirmCompleteOpen(false);
      setConfirmCancelOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant="outline" className="text-muted-foreground border-dashed px-3 py-1 text-sm">
            Draft
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 px-3 py-1 text-sm">
            <AlertCircle className="size-4 mr-1.5" /> Pending Approval
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 px-3 py-1 text-sm">
            <CheckCircle2 className="size-4 mr-1.5" /> Completed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="px-3 py-1 text-sm">
            <XCircle className="size-4 mr-1.5" /> Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalQuantity = receipt.details.reduce((sum: number, d: any) => sum + d.quantity, 0);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/exports')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{receipt.receiptNumber}</h1>
              {getStatusBadge(receipt.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {format(new Date(receipt.createdAt), 'PPP p')}
            </p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center gap-2">
          {receipt.status === 'DRAFT' && permissions.create && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmCancelOpen(true)}
                disabled={isProcessing}
              >
                <XCircle className="size-4 mr-1.5" /> Cancel Receipt
              </Button>
              <Button
                size="sm"
                className="bg-[#1E40AF] hover:bg-[#1E40AF]/90"
                onClick={() => handleAction('submit')}
                disabled={isProcessing}
              >
                <Send className="size-4 mr-1.5" /> Submit for Approval
              </Button>
            </>
          )}

          {receipt.status === 'PENDING' && (
            <>
              {permissions.cancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={isProcessing}
                >
                  <XCircle className="size-4 mr-1.5" /> Cancel
                </Button>
              )}
              {permissions.complete && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setConfirmCompleteOpen(true)}
                  disabled={isProcessing}
                >
                  <PackageCheck className="size-4 mr-1.5" /> Complete Export
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Banners */}
      {receipt.status === 'PENDING' && hasInsufficientStock && (
        <div className="p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Warning: Insufficient Inventory Detected</p>
            <p className="text-xs text-amber-800 mt-1">
              One or more items in this receipt exceed currently available warehouse stock. Completion will fail unless stock is replenished or the order is adjusted.
            </p>
          </div>
        </div>
      )}

      {receipt.status === 'COMPLETED' && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Outbound Receipt Completed</p>
            <p className="text-xs text-emerald-800 mt-0.5">
              All items have been deducted from warehouse inventory. Approved by {receipt.approver?.fullName || 'Authorized Manager'}.
            </p>
          </div>
        </div>
      )}

      {receipt.status === 'CANCELLED' && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
          <XCircle className="size-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Receipt Cancelled</p>
            <p className="text-xs text-red-800 mt-0.5">
              This export receipt has been cancelled. No inventory changes have occurred.
            </p>
          </div>
        </div>
      )}

      {/* Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <Building2 className="size-3.5 mr-1.5 text-muted-foreground" /> Source Warehouse
          </div>
          <div className="font-semibold text-sm">{receipt.warehouse.name}</div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">
            Code: {receipt.warehouse.code} ({receipt.warehouse.status})
          </div>
        </div>

        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <Truck className="size-3.5 mr-1.5 text-muted-foreground" /> Department / Purpose
          </div>
          <div className="font-semibold text-sm">
            {receipt.requestDepartment || 'Standard Outbound'}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {receipt.reason || 'None specified'}
          </div>
        </div>

        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <Calendar className="size-3.5 mr-1.5 text-muted-foreground" /> Export Date
          </div>
          <div className="font-semibold text-sm">
            {format(new Date(receipt.exportDate), 'PPP')}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Updated {format(new Date(receipt.updatedAt), 'MMM d, p')}
          </div>
        </div>

        <div className="p-4 border rounded-md bg-white shadow-sm">
          <div className="text-xs text-muted-foreground mb-1 flex items-center">
            <User className="size-3.5 mr-1.5 text-muted-foreground" /> Created / Approved
          </div>
          <div className="font-semibold text-sm">{receipt.creator.fullName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {receipt.approver ? `Approved: ${receipt.approver.fullName}` : 'Pending approval'}
          </div>
        </div>
      </div>

      {/* Details Table */}
      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Outbound Line Items ({receipt.details.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Total Qty: <strong className="text-gray-900">{totalQuantity} pcs</strong>
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part / SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Export Qty</TableHead>
              {receipt.status !== 'COMPLETED' && (
                <TableHead className="text-center">Current Stock</TableHead>
              )}
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead>Location Picked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipt.details.map((detail: any) => {
              const liveStock = currentStockMap[detail.partId]?.quantity ?? 0;
              const isInsufficient = receipt.status !== 'COMPLETED' && detail.quantity > liveStock;

              return (
                <TableRow key={detail.id} className={isInsufficient ? 'bg-amber-50/50' : ''}>
                  <TableCell>
                    <div className="font-mono text-xs font-semibold text-primary">{detail.part.sku}</div>
                    <div className="font-medium text-sm text-gray-900">{detail.part.name}</div>
                    <div className="text-xs text-muted-foreground">Brand: {detail.part.brand || 'N/A'}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {detail.part.category?.name || 'General'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-semibold font-mono text-sm">{detail.quantity}</span>{' '}
                    <span className="text-xs text-muted-foreground">{detail.part.unit}</span>
                  </TableCell>
                  {receipt.status !== 'COMPLETED' && (
                    <TableCell className="text-center">
                      <Badge
                        variant={liveStock === 0 ? 'destructive' : isInsufficient ? 'destructive' : 'secondary'}
                        className={liveStock >= detail.quantity ? 'bg-emerald-100 text-emerald-800' : ''}
                      >
                        {liveStock} pcs available
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-sm">
                    ¥{Number(detail.unitPrice).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-sm">
                    ¥{Number(detail.totalPrice).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-xs text-muted-foreground font-mono">
                      <MapPin className="size-3 mr-1 text-muted-foreground/70" />
                      {detail.locationPicked || detail.part.locationDefault || 'N/A'}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Footer Summary */}
        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-muted-foreground">
            All prices in Japanese Yen (JPY). Calculations persisted via server-side Decimal precision.
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-sm font-medium text-muted-foreground">Grand Total:</span>
            <span className="text-2xl font-bold font-mono text-[#1E40AF]">
              ¥{Number(receipt.totalAmount).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Complete Export */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Export Completion</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this export receipt? This will:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground bg-gray-50 p-4 rounded-md border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Deduct {totalQuantity} items from warehouse inventory</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Update warehouse occupancy atomically</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Lock receipt status to COMPLETED (immutable)</span>
            </div>
          </div>
          {hasInsufficientStock && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
              Warning: Some items currently exceed recorded stock. The transaction will automatically roll back if stock is insufficient.
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmCompleteOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => handleAction('complete')}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Confirm & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Cancel Receipt */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Export Receipt</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel receipt {receipt.receiptNumber}? Once cancelled, it cannot be edited or completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmCancelOpen(false)}
              disabled={isProcessing}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleAction('cancel')}
              disabled={isProcessing}
            >
              {isProcessing ? 'Cancelling...' : 'Yes, Cancel Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
