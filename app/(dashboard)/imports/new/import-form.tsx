'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImportReceiptSchema } from '@/lib/validations/import-receipt';
import { z } from 'zod';
import { createImportDraft, submitImportReceipt, updateImportDraft } from '@/app/actions/imports';
import { format } from 'date-fns';

import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';

type ImportFormValues = z.infer<typeof ImportReceiptSchema>;

interface ImportFormProps {
  suppliers: any[];
  warehouses: any[];
  parts: any[];
  initialData?: any; // For editing drafts later
}

export function ImportForm({ suppliers, warehouses, parts, initialData }: ImportFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(ImportReceiptSchema),
    defaultValues: initialData ? {
      supplierId: initialData.supplierId,
      warehouseId: initialData.warehouseId,
      poNumber: initialData.poNumber || '',
      deliveryNote: initialData.deliveryNote || '',
      notes: initialData.notes || '',
      details: initialData.details.map((d: any) => ({
        partId: d.partId,
        quantity: d.quantity,
        unitPrice: Number(d.unitPrice),
        notes: d.notes || ''
      })),
    } : {
      poNumber: '',
      deliveryNote: '',
      notes: '',
      details: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: 'details',
    control: form.control,
  });

  const handleSaveDraft = async (data: ImportFormValues) => {
    setIsSaving(true);
    try {
      let res;
      if (initialData?.id) {
        res = await updateImportDraft(initialData.id, data);
      } else {
        res = await createImportDraft(data);
      }
      
      if (res.error) {
        toast.error(res.error);
        if (res.issues) console.error(res.issues);
      } else {
        toast.success('Draft saved successfully');
        router.push('/imports');
        router.refresh();
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitPending = async (data: ImportFormValues) => {
    setIsSubmitting(true);
    try {
      let draftId = initialData?.id;
      
      // If new, create draft first
      if (!draftId) {
        const createRes = await createImportDraft(data);
        if (createRes.error) {
          toast.error(createRes.error);
          setIsSubmitting(false);
          return;
        }
        draftId = createRes.data?.id;
      } else {
        // Update existing draft
        const updateRes = await updateImportDraft(draftId, data);
        if (updateRes.error) {
          toast.error(updateRes.error);
          setIsSubmitting(false);
          return;
        }
      }

      // Submit
      const submitRes = await submitImportReceipt(draftId);
      if (submitRes.error) {
        toast.error(submitRes.error);
      } else {
        toast.success('Receipt submitted successfully');
        router.push('/imports');
        router.refresh();
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch for dynamic recalculation
  const detailsWatcher = form.watch('details');
  const totalAmount = detailsWatcher.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="supplierId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Warehouse *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name} ({w.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="poNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. PO-2026-891" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryNote"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Note</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. DN-55412" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Internal Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Line Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ partId: 0, quantity: 1, unitPrice: 0, notes: '' })}
            >
              <Plus className="mr-2 size-4" /> Add Part
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Part</TableHead>
                  <TableHead className="w-[120px]">Quantity</TableHead>
                  <TableHead className="w-[150px]">Unit Price (¥)</TableHead>
                  <TableHead className="w-[150px]">Total (¥)</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No parts added yet. Click &quot;Add Part&quot; to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((field, index) => {
                    const currentPartId = form.watch(`details.${index}.partId`);
                    const selectedPart = parts.find(p => p.id === Number(currentPartId));
                    const lineQty = form.watch(`details.${index}.quantity`) || 0;
                    const linePrice = form.watch(`details.${index}.unitPrice`) || 0;

                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.partId`}
                            render={({ field: selectField }) => (
                              <Select 
                                onValueChange={(val) => {
                                  selectField.onChange(val);
                                  // Auto-fill price if available
                                  const p = parts.find(p => p.id === Number(val));
                                  if (p && form.getValues(`details.${index}.unitPrice`) === 0) {
                                    form.setValue(`details.${index}.unitPrice`, Number(p.purchasePrice));
                                  }
                                }} 
                                defaultValue={selectField.value ? selectField.value.toString() : undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className={form.formState.errors.details?.[index]?.partId ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Select..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {parts.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                      {p.sku} - {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {form.formState.errors.details?.[index]?.partId && (
                            <p className="text-xs text-red-500 mt-1">{form.formState.errors.details[index].partId?.message}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.quantity`}
                            render={({ field: inputField }) => (
                              <Input 
                                type="number" 
                                min="1" 
                                {...inputField} 
                                className={form.formState.errors.details?.[index]?.quantity ? 'border-red-500' : ''} 
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.unitPrice`}
                            render={({ field: inputField }) => (
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                {...inputField} 
                                className={form.formState.errors.details?.[index]?.unitPrice ? 'border-red-500' : ''} 
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-medium bg-muted/20">
                          ¥{(lineQty * linePrice).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`details.${index}.notes`}
                            render={({ field: inputField }) => (
                              <Input {...inputField} placeholder="Optional..." />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {form.formState.errors.details?.root && (
            <p className="text-sm font-medium text-red-500 mt-2">
              {form.formState.errors.details.root.message}
            </p>
          )}

          <div className="flex justify-end mt-4">
            <div className="bg-muted px-6 py-3 rounded-md flex items-center gap-4">
              <span className="text-muted-foreground font-medium">Grand Total:</span>
              <span className="text-xl font-bold text-[#1E40AF]">¥{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={isSaving || isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="secondary"
            className="gap-2"
            onClick={form.handleSubmit(handleSaveDraft)}
            disabled={isSaving || isSubmitting}
          >
            <Save className="size-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button 
            type="button"
            className="bg-[#1E40AF] hover:bg-[#1E40AF]/90 gap-2"
            onClick={form.handleSubmit(handleSubmitPending)}
            disabled={isSaving || isSubmitting}
          >
            <Send className="size-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Receipt'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
