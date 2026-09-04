'use client';

import React from 'react';
import { formatCurrency } from '@/lib/validations/reports';
import { Star, ShieldAlert } from 'lucide-react';

interface SupplierReportViewProps {
  data: {
    dateRangeLabel: string;
    suppliers: Array<{
      supplierId: number;
      name: string;
      rating: number;
      receiptCount: number;
      totalQuantity: number;
      totalValue: number;
      qcInspectedQty: number;
      qcDefectiveQty: number;
      defectRate: number;
    }>;
  };
}

export function SupplierReportView({ data }: SupplierReportViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Supplier Quality & Fulfillment Performance</h3>
          <p className="text-xs text-gray-500">
            Objective delivery metrics, procurement volume, and verified QC defect rates ({data.dateRangeLabel})
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Supplier Name</th>
                <th className="px-6 py-3 text-center">Supplier Rating</th>
                <th className="px-6 py-3 text-right">Inbound Receipts</th>
                <th className="px-6 py-3 text-right">Delivered Units</th>
                <th className="px-6 py-3 text-right">Procurement Spend</th>
                <th className="px-6 py-3 text-right">QC Inspected</th>
                <th className="px-6 py-3 text-right">Defective Units</th>
                <th className="px-6 py-3 text-right">QC Defect Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.suppliers.length > 0 ? (
                data.suppliers.map((s) => (
                  <tr key={s.supplierId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center text-amber-500 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Star className="size-3 fill-amber-500 mr-1" />
                        {s.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">{s.receiptCount}</td>
                    <td className="px-6 py-4 text-right text-gray-900 font-bold">
                      {s.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-700">
                      {formatCurrency(s.totalValue)}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">{s.qcInspectedQty.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-medium text-rose-600">
                      {s.qcDefectiveQty.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.qcInspectedQty > 0 ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            s.defectRate > 10
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : s.defectRate > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {s.defectRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No QC data</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    No supplier performance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
