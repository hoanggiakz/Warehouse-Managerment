'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { ClipboardCheck, CheckCircle2, AlertTriangle, Scale, AlertOctagon } from 'lucide-react';

interface StockCheckReportViewProps {
  data: {
    dateRangeLabel: string;
    totalChecks: number;
    draftCount: number;
    inProgressCount: number;
    completedCount: number;
    adjustedChecksCount: number;
    cancelledCount: number;
    totalCountedQuantity: number;
    totalExpectedQuantity: number;
    totalVariance: number;
    discrepancyCount: number;
    shortageCount: number;
    surplusCount: number;
    conflictCount: number;
    matchedCount: number;
    notCountedCount: number;
    adjustedDetailsCount: number;
    discrepancyRanking: Array<{
      id: number;
      checkNumber: string;
      warehouseName: string;
      sku: string;
      partName: string;
      systemQty: number;
      actualQty: number | null;
      difference: number | null;
      status: string;
      isAdjusted: boolean;
    }>;
  };
}

export function StockCheckReportView({ data }: StockCheckReportViewProps) {
  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Stock Audit Sessions"
          value={data.totalChecks}
          subtitle={`${data.completedCount + data.adjustedChecksCount} verified audits`}
          icon={ClipboardCheck}
          variant="default"
        />
        <ReportKpiCard
          title="Audited Discrepancies"
          value={data.discrepancyCount}
          subtitle={`${data.shortageCount} shortages, ${data.surplusCount} surpluses`}
          icon={AlertTriangle}
          variant={data.discrepancyCount > 0 ? 'warning' : 'success'}
        />
        <ReportKpiCard
          title="Reconciled Adjustments"
          value={data.adjustedDetailsCount}
          subtitle="Inventory balance updated"
          icon={CheckCircle2}
          variant="success"
        />
        <ReportKpiCard
          title="Net Count Variance"
          value={`${data.totalVariance > 0 ? '+' : ''}${data.totalVariance.toLocaleString()} pcs`}
          subtitle={`Actual: ${data.totalCountedQuantity.toLocaleString()} vs Expected: ${data.totalExpectedQuantity.toLocaleString()}`}
          icon={Scale}
          variant={data.totalVariance === 0 ? 'success' : 'info'}
        />
      </div>

      {/* Discrepancy Ranking Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Physical Stock Count Discrepancy Ranking</h3>
            <p className="text-xs text-gray-500">Items with variances between snapshot system count and physical count</p>
          </div>
          <span className="text-xs text-gray-500">{data.discrepancyRanking.length} discrepancies</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Audit Session</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3">Part Details</th>
                <th className="px-6 py-3 text-right">System Qty</th>
                <th className="px-6 py-3 text-right">Counted Qty</th>
                <th className="px-6 py-3 text-right">Difference</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Reconciled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.discrepancyRanking.length > 0 ? (
                data.discrepancyRanking.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs text-primary font-semibold">
                      {d.checkNumber}
                    </td>
                    <td className="px-6 py-3.5 text-gray-700">{d.warehouseName}</td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-gray-900">{d.partName}</div>
                      <div className="text-xs text-gray-400 font-mono">{d.sku}</div>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-gray-600">{d.systemQty}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                      {d.actualQty !== null ? d.actualQty : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold">
                      {d.difference !== null ? (
                        <span
                          className={
                            d.difference > 0
                              ? 'text-blue-600'
                              : d.difference < 0
                              ? 'text-rose-600'
                              : 'text-gray-500'
                          }
                        >
                          {d.difference > 0 ? `+${d.difference}` : d.difference}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          d.status === 'SHORTAGE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : d.status === 'SURPLUS'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : d.status === 'CONFLICT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      {d.isAdjusted ? (
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="size-3.5 mr-1" /> Yes
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                    No discrepancies detected in verified stock counts.
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
