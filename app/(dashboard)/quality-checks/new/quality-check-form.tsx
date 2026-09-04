'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createQualityCheck } from '@/app/actions/quality-checks';
import {
  DEFECT_CATEGORIES,
  DEFECT_SEVERITIES,
  DISPOSITION_ACTIONS,
} from '@/lib/validations/quality-check';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  ArrowLeft,
  Building2,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Package,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface QualityCheckFormProps {
  warehouses: any[];
  parts: any[];
}

export function QualityCheckForm({ warehouses, parts }: QualityCheckFormProps) {
  const router = useRouter();

  const [partId, setPartId] = useState<string>(parts.length > 0 ? parts[0].id.toString() : '');
  const [warehouseId, setWarehouseId] = useState<string>(
    warehouses.length > 0 ? warehouses[0].id.toString() : ''
  );
  const [checkDate, setCheckDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [quantityChecked, setQuantityChecked] = useState<string>('10');
  const [quantityPassed, setQuantityPassed] = useState<string>('10');
  const [quantityFailed, setQuantityFailed] = useState<string>('0');

  const [failureType, setFailureType] = useState<string>('SURFACE');
  const [failureDescription, setFailureDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('MINOR');
  const [action, setAction] = useState<string>('ACCEPT');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live calculations for UX
  const numChecked = parseInt(quantityChecked, 10) || 0;
  const numPassed = parseInt(quantityPassed, 10) || 0;
  const numFailed = parseInt(quantityFailed, 10) || 0;

  const isSumValid = numChecked > 0 && numPassed + numFailed === numChecked;
  const passRate = numChecked > 0 ? Math.round((numPassed / numChecked) * 100) : 0;
  const defectRate = numChecked > 0 ? Math.round((numFailed / numChecked) * 100) : 0;

  const derivedResult =
    numFailed === 0
      ? 'PASSED'
      : numFailed === numChecked
      ? 'FAILED'
      : 'PARTIALLY_PASSED';

  const selectedPart = parts.find((p) => p.id.toString() === partId);

  const handleCheckedChange = (val: string) => {
    setQuantityChecked(val);
    const parsed = parseInt(val, 10) || 0;
    // Default pass = checked, failed = 0
    setQuantityPassed(String(parsed));
    setQuantityFailed('0');
  };

  const handlePassedChange = (val: string) => {
    setQuantityPassed(val);
    const passed = parseInt(val, 10) || 0;
    if (numChecked >= passed) {
      setQuantityFailed(String(numChecked - passed));
    }
  };

  const handleFailedChange = (val: string) => {
    setQuantityFailed(val);
    const failed = parseInt(val, 10) || 0;
    if (numChecked >= failed) {
      setQuantityPassed(String(numChecked - failed));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partId) {
      toast.error('Vui lòng chọn phụ tùng kiểm định.');
      return;
    }

    if (numChecked <= 0) {
      toast.error('Số lượng kiểm tra phải lớn hơn 0 (BR-31).');
      return;
    }

    if (numPassed + numFailed !== numChecked) {
      toast.error(`Tổng số lượng đạt (${numPassed}) và lỗi (${numFailed}) phải bằng tổng kiểm tra (${numChecked}) (BR-32).`);
      return;
    }

    if (numFailed > 0 && (!failureType || !failureDescription.trim())) {
      toast.error('Vui lòng phân loại lỗi và mô tả chi tiết lỗi khi có phụ tùng không đạt (BR-34).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createQualityCheck({
        partId: Number(partId),
        warehouseId: warehouseId ? Number(warehouseId) : undefined,
        checkDate,
        quantityChecked: numChecked,
        quantityPassed: numPassed,
        quantityFailed: numFailed,
        failureType: numFailed > 0 ? failureType : undefined,
        failureDescription: numFailed > 0 ? failureDescription.trim() : undefined,
        severity: severity as any,
        action: action as any,
      });

      if (res?.error) {
        toast.error(res.error);
      } else if (res?.data) {
        toast.success(`Đã tạo phiếu kiểm định ${res.data.checkNumber} thành công!`);
        router.push(`/quality-checks/${res.data.id}`);
      }
    } catch {
      toast.error('Có lỗi xảy ra khi tạo phiếu kiểm tra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Package className="size-4 text-muted-foreground" /> Phụ tùng kiểm tra *
          </label>
          <Select value={partId} onValueChange={setPartId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Chọn phụ tùng..." />
            </SelectTrigger>
            <SelectContent>
              {parts.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.sku} - {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPart && (
            <p className="text-xs text-muted-foreground">
              Đơn vị: <span className="font-semibold text-foreground">{selectedPart.unit}</span> • Danh mục: {selectedPart.category?.name || '-'}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="size-4 text-muted-foreground" /> Kho hàng liên quan (tùy chọn)
          </label>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Không chọn kho cụ thể" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id.toString()}>
                  {w.name} ({w.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 max-w-xs">
        <label className="text-sm font-semibold text-foreground">Ngày kiểm tra</label>
        <Input
          type="date"
          value={checkDate}
          onChange={(e) => setCheckDate(e.target.value)}
          className="bg-white"
        />
      </div>

      {/* Quantity Inputs Section */}
      <div className="border rounded-lg p-4 bg-gray-50/50 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="size-4 text-primary" /> Số lượng kiểm tra & Kết quả
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Số lượng kiểm tra *</label>
            <Input
              type="number"
              min="1"
              value={quantityChecked}
              onChange={(e) => handleCheckedChange(e.target.value)}
              className="bg-white font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-700">Số lượng đạt chuẩn *</label>
            <Input
              type="number"
              min="0"
              value={quantityPassed}
              onChange={(e) => handlePassedChange(e.target.value)}
              className="bg-white text-emerald-700 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-rose-700">Số lượng lỗi / không đạt *</label>
            <Input
              type="number"
              min="0"
              value={quantityFailed}
              onChange={(e) => handleFailedChange(e.target.value)}
              className="bg-white text-rose-700 font-semibold"
            />
          </div>
        </div>

        {/* Live Calculation Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border rounded-md text-xs">
          <div className="flex items-center gap-4">
            <div>
              Tỷ lệ đạt: <span className="font-bold text-emerald-600">{passRate}%</span>
            </div>
            <div>
              Tỷ lệ lỗi: <span className="font-bold text-rose-600">{defectRate}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              Kết quả dự kiến:
              {derivedResult === 'PASSED' && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  PASSED (100% đạt)
                </Badge>
              )}
              {derivedResult === 'PARTIALLY_PASSED' && (
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                  PARTIALLY_PASSED
                </Badge>
              )}
              {derivedResult === 'FAILED' && (
                <Badge variant="destructive">FAILED (Không đạt)</Badge>
              )}
            </div>
          </div>

          {!isSumValid && (
            <div className="text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="size-3.5" />
              Tổng Đạt + Lỗi ({numPassed + numFailed}) không bằng Tổng kiểm tra ({numChecked})
            </div>
          )}
        </div>
      </div>

      {/* Defect Classification (Visible when quantityFailed > 0) */}
      {numFailed > 0 && (
        <div className="border border-rose-200 rounded-lg p-4 bg-rose-50/20 space-y-4">
          <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="size-4 text-rose-600" /> Phân loại khuyết tật & Khuyến nghị xử lý
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Loại khuyết tật *</label>
              <Select value={failureType} onValueChange={setFailureType}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Chọn loại lỗi..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFECT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Mức độ nghiêm trọng *</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Chọn mức độ..." />
                </SelectTrigger>
                <SelectContent>
                  {DEFECT_SEVERITIES.map((sev) => (
                    <SelectItem key={sev} value={sev}>
                      {sev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Đề xuất phương án</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Chọn phương án..." />
                </SelectTrigger>
                <SelectContent>
                  {DISPOSITION_ACTIONS.map((act) => (
                    <SelectItem key={act} value={act}>
                      {act}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mô tả chi tiết khuyết tật *</label>
            <Textarea
              placeholder="Ghi rõ chi tiết lỗi phát hiện (VD: Nứt gãy mép cao su lốp, sai lệch kích thước ren ốc...)"
              value={failureDescription}
              onChange={(e) => setFailureDescription(e.target.value)}
              className="bg-white text-xs"
              rows={3}
            />
          </div>
        </div>
      )}

      <Alert className="bg-blue-50/60 border-blue-200 text-blue-900">
        <ShieldCheck className="size-4 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800">
          Tạo phiếu kiểm định chất lượng sẽ khởi tạo ở trạng thái <strong>Dự thảo (Draft)</strong> và <strong>không làm thay đổi tồn kho tự động</strong>. Mọi tác vụ trừ tồn kho do phụ tùng hỏng chỉ diễn ra khi người có thẩm quyền phê duyệt xử lý tồn kho.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between pt-4 border-t">
        <Link href="/quality-checks">
          <Button type="button" variant="outline">
            <ArrowLeft className="size-4 mr-1.5" /> Quay lại danh sách
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || !isSumValid}>
          {isSubmitting ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <ShieldCheck className="size-4 mr-2" />
          )}
          Tạo phiếu kiểm định
        </Button>
      </div>
    </form>
  );
}
