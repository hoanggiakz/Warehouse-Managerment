'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { StockAdjustmentSchema, StockAdjustmentFormValues } from '@/lib/validations/inventory';
import { adjustStock } from '@/app/actions/inventory';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface AdjustStockDialogProps {
  inventory: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AdjustStockDialog({ inventory, open, onOpenChange, onSuccess }: AdjustStockDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(StockAdjustmentSchema) as any,
    defaultValues: {
      inventoryId: inventory?.id || 0,
      adjustmentQuantity: 0,
      reason: '',
    },
  });

  // Reset form when inventory changes
  if (inventory && form.getValues('inventoryId') !== inventory.id) {
    form.reset({
      inventoryId: inventory.id,
      adjustmentQuantity: 0,
      reason: '',
    });
  }

  const currentQuantity = inventory?.quantity || 0;
  const adjustmentQuantity = form.watch('adjustmentQuantity') || 0;
  const newQuantity = currentQuantity + Number(adjustmentQuantity);

  const onSubmit = async (data: StockAdjustmentFormValues) => {
    setLoading(true);
    try {
      const res = await adjustStock(data);
      if (res.error) {
        toast.error(res.error);
        if (res.issues) {
          res.issues.forEach((issue: any) => {
            form.setError(issue.path[0] as any, { message: issue.message });
          });
        }
      } else {
        toast.success(`Stock adjusted successfully. New quantity: ${res.data?.quantity}`);
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!inventory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {inventory.part.name} ({inventory.part.sku}) at {inventory.warehouse.code}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-md text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Current Stock</p>
                <p className="font-semibold text-lg">{currentQuantity}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">New Stock</p>
                <p className={`font-semibold text-lg ${newQuantity < 0 ? 'text-red-500' : 'text-[#1E40AF]'}`}>
                  {newQuantity}
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="adjustmentQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment (Use negative to decrease)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 5 or -5" {...field} />
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
                  <FormLabel>Reason for Adjustment</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. Physical count correction, damaged goods..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1E40AF] hover:bg-blue-900" disabled={loading || newQuantity < 0}>
                {loading ? 'Confirming...' : 'Confirm Adjustment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
