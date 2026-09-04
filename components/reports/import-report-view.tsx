'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { formatCurrency } from '@/lib/validations/reports';
import { ArrowDownLeft, FileText, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';

interface ImportReportViewProps {
  data: {
    dateRangeLabel: string;
    totalReceipts: number;
    draftCount: number;
    pendingCount: number;
    completedCount: number;
    cancelledCount: number;
    totalImportedQuantity: number;
    totalImportValue: number;
    averageReceiptValue: number;
    topSuppliers: Array<{
      supplierId: number;
      supplierName: string;
      receiptCount: number;
      totalValue: number;
    }>;
  };
}

export function ImportReportView({ data }: ImportReportViewProps) {
  return (
    <div className="space-y-6">
      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Total Import Receipts"
          value={data.totalReceipts}
          subtitle={`${data.completedCount} completed, ${data.pendingCount} pending`}
          icon={FileText}
          variant="default"
        />
        <ReportKpiCard
          title="Total Units Received"
          value={`${data.totalImportedQuantity.toLocaleString()} pcs`}
          subtitle="Delivered to storage bins"
          icon={ArrowDownLeft}
          variant="success"
        />
        <ReportKpiCard
          title="Total Spend (Value)"
          value={formatCurrency(data.totalImportValue)}
          subtitle="Completed purchase receipts"
          icon={DollarSign}
          variant="info"
        />
        <ReportKpiCard
          title="Average PO / Receipt Value"
          value={formatCurrency(data.averageReceiptValue)}
          subtitle="Per completed shipment"
          icon={TrendingUp}
          variant="default"
        />
      </div>

      {/* Status Breakdown & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Status Summary */}
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Receipt Status Breakdown</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" /> Completed
              </span>
              <span className="font-bold text-gray-900">{data.completedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500" /> Pending Review
              </span>
              <span className="font-bold text-gray-900">{data.pendingCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" /> Draft
              </span>
              <span className="font-bold text-gray-900">{data.draftCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 flex items-center gap-2">
                <span className="size-2 rounded-full bg-gray-400" /> Cancelled
              </span>
              <span className="font-bold text-gray-900">{data.cancelledCount}</span>
            </div>
          </div>
        </div>

        {/* Top Suppliers List */}
        <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold text-gray-900">Top Inbound Suppliers by Volume</h3>
            <p className="text-xs text-gray-500">Highest procurement spend and shipment frequency</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-3">Supplier Name</th>
                  <th className="px-6 py-3 text-right">Receipts</th>
                  <th className="px-6 py-3 text-right">Total Procurement Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.topSuppliers.length > 0 ? (
                  data.topSuppliers.map((s) => (
                    <tr key={s.supplierId} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-gray-900">{s.supplierName}</td>
                      <td className="px-6 py-3.5 text-right text-gray-700">{s.receiptCount}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-700">
                        {formatCurrency(s.totalValue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-sm text-gray-500">
                      No supplier transactions in this date range.
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
