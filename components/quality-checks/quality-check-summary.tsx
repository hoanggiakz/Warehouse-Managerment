import { Card, CardContent } from '@/components/ui/card';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Flame,
  ShieldCheck,
} from 'lucide-react';

interface QualityCheckSummaryProps {
  quantityChecked: number;
  quantityPassed: number;
  quantityFailed: number;
  severity?: string | null;
  result?: string | null;
}

export function QualityCheckSummary({
  quantityChecked,
  quantityPassed,
  quantityFailed,
  severity,
  result,
}: QualityCheckSummaryProps) {
  const passRate = quantityChecked > 0 ? Math.round((quantityPassed / quantityChecked) * 100) : 0;
  const defectRate = quantityChecked > 0 ? Math.round((quantityFailed / quantityChecked) * 100) : 0;

  const isCritical = severity === 'CRITICAL';
  const isHigh = severity === 'HIGH' || severity === 'MAJOR';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="border shadow-none bg-white">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tổng kiểm tra</p>
            <p className="text-xl font-bold mt-0.5">{quantityChecked.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
            <Boxes className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none bg-white">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Đạt tiêu chuẩn</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{quantityPassed.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none bg-white">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Lỗi / Hỏng hóc</p>
            <p className="text-xl font-bold mt-0.5 text-rose-600">{quantityFailed.toLocaleString()}</p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none bg-white">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tỷ lệ đạt (Pass)</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-700">{passRate}%</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <Percent className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none bg-white">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tỷ lệ lỗi (Defect)</p>
            <p className={`text-xl font-bold mt-0.5 ${defectRate > 0 ? 'text-rose-600' : 'text-gray-600'}`}>
              {defectRate}%
            </p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <Percent className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className={`border shadow-none ${isCritical ? 'bg-red-50/50 border-red-200' : 'bg-white'}`}>
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Mức độ nghiêm trọng</p>
            <p className={`text-sm font-bold mt-0.5 ${isCritical ? 'text-red-700' : isHigh ? 'text-orange-700' : 'text-gray-700'}`}>
              {severity || 'Bình thường'}
            </p>
          </div>
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>
            {isCritical ? <Flame className="size-4" /> : <ShieldCheck className="size-4" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
