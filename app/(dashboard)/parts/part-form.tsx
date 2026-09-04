'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPart, updatePart } from '@/app/actions/parts';
import { toast } from 'sonner';

interface PartFormProps {
  initialData?: any;
  categories: any[];
  suppliers: any[];
}

export function PartForm({ initialData, categories, suppliers }: PartFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: initialData?.sku || '',
    name: initialData?.name || '',
    categoryId: initialData?.categoryId || '',
    brand: initialData?.brand || '',
    unit: initialData?.unit || 'pcs',
    purchasePrice: initialData?.purchasePrice || '',
    salePrice: initialData?.salePrice || '',
    supplierId: initialData?.supplierId || '',
    minStock: initialData?.minStock || 0,
    maxStock: initialData?.maxStock || 0,
    locationDefault: initialData?.locationDefault || '',
    status: initialData?.status || 'ACTIVE',
  });

  const [specs, setSpecs] = useState<any>(initialData?.specifications || {});

  const selectedCategory = categories.find(c => c.id === formData.categoryId);
  const getCategoryType = () => {
    if (!selectedCategory) return 'other';
    const topLevelName = selectedCategory.parentId
      ? categories.find(c => c.id === selectedCategory.parentId)?.name.toLowerCase() || ''
      : selectedCategory.name.toLowerCase();
    
    if (topLevelName.includes('wheel')) return 'wheel';
    if (topLevelName.includes('tire')) return 'tire';
    return 'accessory';
  };

  const categoryType = getCategoryType();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecChange = (field: string, value: any) => {
    setSpecs((prev: any) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submitData = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice),
        salePrice: Number(formData.salePrice),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock),
        specifications: specs
      };

      let res;
      if (initialData) {
        res = await updatePart(initialData.id, submitData);
      } else {
        res = await createPart(submitData);
      }

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Part ${initialData ? 'updated' : 'created'} successfully`);
        router.push('/parts');
        router.refresh();
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SKU *</Label>
            <Input required value={formData.sku} onChange={e => handleInputChange('sku', e.target.value)} disabled={!!initialData} />
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select required value={formData.categoryId} onValueChange={v => handleInputChange('categoryId', v)}>
              <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Brand *</Label>
            <Input required value={formData.brand} onChange={e => handleInputChange('brand', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select required value={formData.supplierId} onValueChange={v => handleInputChange('supplierId', v)}>
              <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Unit *</Label>
            <Input required value={formData.unit} onChange={e => handleInputChange('unit', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={v => handleInputChange('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Purchase Price (¥) *</Label>
            <Input type="number" required min="0" step="0.01" value={formData.purchasePrice} onChange={e => handleInputChange('purchasePrice', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Sale Price (¥) *</Label>
            <Input type="number" required min="0" step="0.01" value={formData.salePrice} onChange={e => handleInputChange('salePrice', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Minimum Stock *</Label>
            <Input type="number" required min="0" value={formData.minStock} onChange={e => handleInputChange('minStock', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Maximum Stock *</Label>
            <Input type="number" required min="0" value={formData.maxStock} onChange={e => handleInputChange('maxStock', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Default Location</Label>
            <Input value={formData.locationDefault} onChange={e => handleInputChange('locationDefault', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryType === 'wheel' && (
            <>
              <div className="space-y-2">
                <Label>Size (inch) *</Label>
                <Input type="number" required step="0.5" value={specs.size || ''} onChange={e => handleSpecChange('size', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Width (inch) *</Label>
                <Input type="number" required step="0.5" value={specs.width || ''} onChange={e => handleSpecChange('width', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>PCD *</Label>
                <Input required placeholder="e.g. 5x114.3" value={specs.pcd || ''} onChange={e => handleSpecChange('pcd', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ET (Offset) *</Label>
                <Input type="number" required value={specs.et || ''} onChange={e => handleSpecChange('et', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Holes *</Label>
                <Input type="number" required value={specs.holes || ''} onChange={e => handleSpecChange('holes', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Material *</Label>
                <Input required value={specs.material || ''} onChange={e => handleSpecChange('material', e.target.value)} />
              </div>
            </>
          )}

          {categoryType === 'tire' && (
            <>
              <div className="space-y-2">
                <Label>Width (mm) *</Label>
                <Input type="number" required value={specs.width || ''} onChange={e => handleSpecChange('width', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Aspect Ratio *</Label>
                <Input type="number" required value={specs.aspectRatio || ''} onChange={e => handleSpecChange('aspectRatio', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Diameter (inch) *</Label>
                <Input type="number" required value={specs.diameter || ''} onChange={e => handleSpecChange('diameter', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Load Index *</Label>
                <Input type="number" required value={specs.loadIndex || ''} onChange={e => handleSpecChange('loadIndex', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Speed Rating *</Label>
                <Input required placeholder="e.g. Y" value={specs.speedRating || ''} onChange={e => handleSpecChange('speedRating', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>DOT</Label>
                <Input placeholder="e.g. 1224" value={specs.dot || ''} onChange={e => handleSpecChange('dot', e.target.value)} />
              </div>
            </>
          )}

          {categoryType === 'accessory' && (
            <>
              <div className="space-y-2">
                <Label>Accessory Type *</Label>
                <Input required placeholder="e.g. TPMS Sensor" value={specs.type || ''} onChange={e => handleSpecChange('type', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Compatible Models (comma separated)</Label>
                <Input 
                  value={specs.compatibleModels?.join(', ') || ''} 
                  onChange={e => handleSpecChange('compatibleModels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-[#1E40AF] hover:bg-blue-900 text-white">
          {loading ? 'Saving...' : 'Save Part'}
        </Button>
      </div>
    </form>
  );
}
