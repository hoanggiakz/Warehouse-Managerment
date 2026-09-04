'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { formatCurrency } from '@/lib/validations/reports';
import { ArrowUpRight, FileCheck, CheckCircle2, DollarSign, Package } from 'lucide-react';

interface ExportReportViewProps {
  data: {
    dateRangeLabel: string;
    totalReceipts: number;
    draftCount: number;
    pendingCount: number;
    approvedCount: number;
    completedCount: number;
    cancelledCount: number;
    totalExportedQuantity: number;
    totalExportValue: number;
    averageReceiptValue: number;
    topExportedParts: Array<{
      partId: number;
      sku: string;
      partName: string;
      quantity: number;
      receiptCount: number;
    }>;
  };
}

export function ExportReportView({ data }: ExportReportViewProps) {
  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Total Export Orders"
          value={data.totalReceipts}
          subtitle={`${data.completedCount} fulfilled shipments`}
          icon={FileCheck}
          variant="default"
        />
        <ReportKpiCard
          title="Total Units Dispatched"
          value={`${data.totalExportedQuantity.toLocaleString()} pcs`}
          subtitle="Outbound orders shipped"
          icon={ArrowUpRight}
          variant="info"
        />
        <ReportKpiCard
          title="Total Outbound Value"
          value={formatCurrency(data.totalExportValue)}
          subtitle="Fulfilled export receipts"
          icon={DollarSign}
          variant="success"
        />
        <ReportKpiCard
          title="Average Order Value"
          value={formatCurrency(data.averageReceiptValue)}
          subtitle="Per completed outbound shipment"
          icon={Package}
          variant="default"
        />
      </div>

      {/* Status Breakdown & Top Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Order Status Summary */}
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Export Lifecycle Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="font-bold text-gray-900">{data.completedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" /> Approved (Picking)
              </span>
              <span className="font-bold text-gray-900">{data.approvedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" /> Pending Approval
              </span>
              <span className="font-bold text-gray-900">{data.pendingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-gray-400" /> Draft
              </span>
              <span className="font-bold text-gray-900">{data.draftCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-400" /> Cancelled
              </span>
              <span className="font-bold text-gray-900">{data.cancelledCount}</span>
            </div>
          </div>
        </div>

        {/* Top Exported Parts */}
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold text-gray-900">Most Frequently Dispatched Parts</h3>
            <p className="text-xs text-gray-500">Highest quantity outbound automotive components</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-3">Part Details</th>
                  <th className="px-6 py-3 text-right">Orders / Shipments</th>
                  <th className="px-6 py-3 text-right">Quantity Shipped</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topExportedParts.length > 0 ? (
                  data.topExportedParts.map((p) => (
                    <tr key={p.partId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-gray-900">{p.partName}</div>
                        <div className="text-xs text-gray-400 font-mono">{p.sku}</div>
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-700">{p.receiptCount}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-blue-700">
                        {p.quantity.toLocaleString()} pcs
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No exported items found in the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
