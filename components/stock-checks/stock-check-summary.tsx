import { Card, CardContent } from '@/components/ui/card';
import {
  Boxes,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface StockCheckSummaryProps {
  details: Array<{
    systemQty: number;
    actualQty: number | null;
    difference: number | null;
    status: string;
  }>;
}

export function StockCheckSummary({ details }: StockCheckSummaryProps) {
  const totalItems = details.length;
  const countedItems = details.filter((d) => d.actualQty !== null).length;
  const uncountedItems = totalItems - countedItems;

  const matchedItems = details.filter((d) => d.status === 'MATCHED').length;
  const shortageItems = details.filter((d) => d.status === 'SHORTAGE').length;
  const surplusItems = details.filter((d) => d.status === 'SURPLUS').length;

  let totalDiscrepancyQty = 0;
  for (const d of details) {
    if (d.difference !== null) {
      totalDiscrepancyQty += d.difference;
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Tổng phụ tùng</p>
            <p className="text-xl font-bold mt-0.5">{totalItems}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
            <Boxes className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Chưa đếm</p>
            <p className="text-xl font-bold mt-0.5 text-gray-600">{uncountedItems}</p>
          </div>
          <div className="p-2 rounded-lg bg-gray-100 text-gray-500">
            <Clock className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Khớp số liệu</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{matchedItems}</p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Thiếu hụt</p>
            <p className="text-xl font-bold mt-0.5 text-rose-600">{shortageItems}</p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <TrendingDown className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Thừa tồn</p>
            <p className="text-xl font-bold mt-0.5 text-indigo-600">{surplusItems}</p>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <TrendingUp className="size-4" />
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-none">
        <CardContent className="p-3.5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Chênh lệch ròng</p>
            <p
              className={`text-xl font-bold mt-0.5 ${
                totalDiscrepancyQty > 0
                  ? 'text-indigo-600'
                  : totalDiscrepancyQty < 0
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}
            >
              {totalDiscrepancyQty > 0 ? `+${totalDiscrepancyQty}` : totalDiscrepancyQty}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <AlertCircle className="size-4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
