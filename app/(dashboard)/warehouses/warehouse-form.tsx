'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { WarehouseSchema, WarehouseFormValues } from '@/lib/validations/warehouse';
import { createWarehouse, updateWarehouse } from '@/app/actions/warehouses';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface WarehouseFormProps {
  initialData?: any;
}

export function WarehouseForm({ initialData }: WarehouseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(WarehouseSchema) as any,
    defaultValues: initialData ? {
      code: initialData.code,
      name: initialData.name,
      address: initialData.address || '',
      phone: initialData.phone || '',
      description: initialData.description || '',
      capacity: initialData.capacity,
      status: initialData.status,
    } : {
      code: '',
      name: '',
      address: '',
      phone: '',
      description: '',
      capacity: 10000,
      status: 'ACTIVE',
    },
  });

  const onSubmit = async (data: WarehouseFormValues) => {
    setLoading(true);
    try {
      let res;
      if (initialData) {
        res = await updateWarehouse(initialData.id, data);
      } else {
        res = await createWarehouse(data);
      }

      if (res.error) {
        toast.error(res.error);
        if (res.issues) {
          res.issues.forEach((issue: any) => {
            form.setError(issue.path[0] as any, { message: issue.message });
          });
        }
      } else {
        toast.success(`Warehouse ${initialData ? 'updated' : 'created'} successfully`);
        router.push('/warehouses');
        router.refresh();
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Warehouse' : 'New Warehouse'}</CardTitle>
        <CardDescription>
          {initialData 
            ? 'Update the warehouse information.' 
            : 'Enter the details for the new warehouse location.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. WH-OSK-01" {...field} disabled={!!initialData} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Osaka Central Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. +81-6-1234-5678" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Capacity (units) *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operational Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="MAINTENANCE">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physical Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Full address of the warehouse" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes about this warehouse" 
                      className="resize-none" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => router.push('/warehouses')} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#1E40AF] hover:bg-blue-900" disabled={loading}>
                {loading ? 'Saving...' : initialData ? 'Update Warehouse' : 'Create Warehouse'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
