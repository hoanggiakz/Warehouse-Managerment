'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExportReceiptSchema, ExportReceiptFormValues } from '@/lib/validations/export-receipt';
import { createExportDraft, submitExportReceipt, updateExportDraft, getWarehouseStockForExport } from '@/app/actions/exports';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, Send, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ExportFormProps {
  warehouses: any[];
  parts: any[];
  initialData?: any; // For editing drafts
}

export function ExportForm({ warehouses, parts, initialData }: ExportFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockMap, setStockMap] = useState<Record<number, { quantity: number; location: string | null }>>({});
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const form = useForm<ExportReceiptFormValues>({
    resolver: zodResolver(ExportReceiptSchema),
    defaultValues: initialData
      ? {
          warehouseId: initialData.warehouseId,
          requestDepartment: initialData.requestDepartment || '',
          reason: initialData.reason || '',
          details: initialData.details.map((d: any) => ({
            partId: d.partId,
            quantity: d.quantity,
            unitPrice: Number(d.unitPrice),
            locationPicked: d.locationPicked || '',
          })),
        }
      : {
          warehouseId: warehouses[0]?.id || 0,
          requestDepartment: '',
          reason: '',
          details: [],
        },
  });

  const { fields, append, remove } = useFieldArray({
    name: 'details',
    control: form.control,
  });

  const selectedWarehouseId = form.watch('warehouseId');
  const detailsWatch = form.watch('details');

  // Load live warehouse stock whenever selected warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) return;

    let mounted = true;
    setIsLoadingStock(true);

    getWarehouseStockForExport(Number(selectedWarehouseId))
      .then((stocks) => {
        if (mounted) {
          setStockMap(stocks);
        }
      })
      .catch((err) => {
        console.error('Failed to load stock map:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingStock(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedWarehouseId]);

  // Financial and quantity calculations (for UX display)
  const totalQuantity = (detailsWatch || []).reduce((sum, d) => sum + (Number(d?.quantity) || 0), 0);
  const totalAmount = (detailsWatch || []).reduce(
    (sum, d) => sum + (Number(d?.quantity) || 0) * (Number(d?.unitPrice) || 0),
    0
  );

  const handleSaveDraft = async (data: ExportReceiptFormValues) => {
    setIsSaving(true);
    try {
      let res;
      if (initialData?.id) {
        res = await updateExportDraft(initialData.id, data);
      } else {
        res = await createExportDraft(data);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Lưu phiếu xuất nháp thành công');
        router.push('/exports');
        router.refresh();
      }
    } catch {
      toast.error('Có lỗi xảy ra khi lưu phiếu xuất');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPending = async (data: ExportReceiptFormValues) => {
    // Client-side pre-check for convenience
    for (const item of data.details) {
      const available = stockMap[item.partId]?.quantity ?? 0;
      if (item.quantity > available) {
        const part = parts.find((p) => p.id === item.partId);
        toast.error(
          `Cảnh báo: Phụ tùng "${part?.name || item.partId}" chỉ có ${available} tồn kho (yêu cầu: ${item.quantity}). Vui lòng điều chỉnh số lượng.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let receiptId = initialData?.id;

      if (!receiptId) {
        const createRes = await createExportDraft(data);
        if (createRes.error) {
          toast.error(createRes.error);
          setIsSubmitting(false);
          return;
        }
        receiptId = createRes.data?.id;
      } else {
        const updateRes = await updateExportDraft(receiptId, data);
        if (updateRes.error) {
          toast.error(updateRes.error);
          setIsSubmitting(false);
          return;
        }
      }

      const submitRes = await submitExportReceipt(receiptId);
      if (submitRes.error) {
        toast.error(submitRes.error);
      } else {
        toast.success('Đã nộp phiếu xuất để duyệt (PENDING)');
        router.push('/exports');
        router.refresh();
      }
    } catch {
      toast.error('Có lỗi xảy ra khi nộp phiếu xuất');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDetailRow = () => {
    // Default to the first available part not already selected
    const selectedPartIds = new Set((form.getValues('details') || []).map((d) => d.partId));
    const nextPart = parts.find((p) => !selectedPartIds.has(p.id)) || parts[0];

    if (!nextPart) {
      toast.error('Không có phụ tùng nào khả dụng để chọn');
      return;
    }

    const currentStock = stockMap[nextPart.id];

    append({
      partId: nextPart.id,
      quantity: 1,
      unitPrice: Number(nextPart.salePrice),
      locationPicked: currentStock?.location || nextPart.locationDefault || '',
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source Warehouse *</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(Number(val))}
                  value={field.value ? field.value.toString() : ''}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select export warehouse" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id.toString()}>
                        {wh.code} - {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requestDepartment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Requesting Department / Recipient</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Assembly Line 1, Retail Store..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason / Export Purpose</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Assembly order dispatch, Stock transfer..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dynamic Detail Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-lg font-semibold">Export Items</h3>
              <p className="text-xs text-muted-foreground">
                Select parts to export from warehouse. Live stock is checked in real-time.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDetailRow}
              className="border-dashed"
            >
              <Plus className="size-4 mr-1.5" /> Add Part
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-md bg-muted/20">
              <p className="text-sm text-muted-foreground mb-3">No parts added to this export receipt yet.</p>
              <Button type="button" variant="secondary" size="sm" onClick={addDetailRow}>
                <Plus className="size-4 mr-1.5" /> Add First Part
              </Button>
            </div>
          ) : (
            <div className="border rounded-md bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[32%]">Part / SKU</TableHead>
                    <TableHead className="w-[14%]">Current Stock</TableHead>
                    <TableHead className="w-[14%]">Export Qty</TableHead>
                    <TableHead className="w-[16%]">Unit Price (¥)</TableHead>
                    <TableHead className="w-[14%] text-right">Line Total</TableHead>
                    <TableHead className="w-[10%] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const currentPartId = form.watch(`details.${index}.partId`);
                    const currentQty = form.watch(`details.${index}.quantity`) || 0;
                    const currentPrice = form.watch(`details.${index}.unitPrice`) || 0;
                    const stockInfo = stockMap[currentPartId];
                    const availableStock = stockInfo?.quantity ?? 0;
                    const isOverStock = currentQty > availableStock;

                    return (
                      <TableRow key={field.id}>
                        {/* Part Selection */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.partId`}
                            render={({ field: pField }) => (
                              <FormItem>
                                <Select
                                  value={pField.value ? pField.value.toString() : ''}
                                  onValueChange={(val) => {
                                    const partId = Number(val);
                                    pField.onChange(partId);
                                    const selected = parts.find((p) => p.id === partId);
                                    if (selected) {
                                      form.setValue(`details.${index}.unitPrice`, Number(selected.salePrice));
                                      const stk = stockMap[partId];
                                      if (stk?.location) {
                                        form.setValue(`details.${index}.locationPicked`, stk.location);
                                      }
                                    }
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select Part" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-72">
                                    {parts.map((part) => (
                                      <SelectItem key={part.id} value={part.id.toString()}>
                                        <div className="flex flex-col">
                                          <span className="font-medium text-xs font-mono">{part.sku}</span>
                                          <span className="text-xs text-muted-foreground">{part.name}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Available Stock Badge */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={availableStock === 0 ? 'destructive' : isOverStock ? 'destructive' : 'secondary'}
                              className={
                                availableStock > 0 && !isOverStock
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ''
                              }
                            >
                              {isLoadingStock ? '...' : `${availableStock} pcs`}
                            </Badge>
                            {stockInfo?.location && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Loc: {stockInfo.location}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Quantity */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.quantity`}
                            render={({ field: qField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    className={isOverStock ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    {...qField}
                                    onChange={(e) => qField.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                {isOverStock && (
                                  <span className="text-[11px] text-red-500 flex items-center gap-1 mt-0.5">
                                    <AlertTriangle className="size-3" /> Exceeds stock
                                  </span>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Unit Price */}
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.unitPrice`}
                            render={({ field: uField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    {...uField}
                                    onChange={(e) => uField.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>

                        {/* Line Total */}
                        <TableCell className="text-right font-mono font-medium text-sm">
                          ¥{(currentQty * currentPrice).toLocaleString()}
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 border rounded-lg bg-gray-50 gap-4">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Total Items</span>
              <span className="font-semibold text-lg">{fields.length} lines</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Total Units</span>
              <span className="font-semibold text-lg">{totalQuantity} pcs</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-muted-foreground block text-xs">Total Export Amount</span>
            <span className="font-bold text-2xl text-[#1E40AF] font-mono">
              ¥{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSaving || isSubmitting}
          >
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit(handleSaveDraft)}
              disabled={isSaving || isSubmitting || fields.length === 0}
            >
              <Save className="size-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>

            <Button
              type="button"
              className="bg-[#1E40AF] hover:bg-[#1E40AF]/90"
              onClick={form.handleSubmit(handleSubmitPending)}
              disabled={isSaving || isSubmitting || fields.length === 0}
            >
              <Send className="size-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Export (Pending)'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
