'use client';

import React from 'react';
import { DistributionBar } from './visualizations/distribution-bar';
import { CheckCircle2, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react';

interface StockStatusReportViewProps {
  data: {
    totalRecords: number;
    summary: {
      NORMAL: { count: number; quantity: number; percentage: number };
      LOW: { count: number; quantity: number; percentage: number };
      OUT: { count: number; quantity: number; percentage: number };
      OVER: { count: number; quantity: number; percentage: number };
    };
    items: Array<{
      id: number;
      partId: number;
      sku: string;
      partName: string;
      categoryName: string;
      warehouseId: number;
      warehouseCode: string;
      warehouseName: string;
      quantity: number;
      minStock: number;
      maxStock: number;
      status: string;
    }>;
  };
}

export function StockStatusReportView({ data }: StockStatusReportViewProps) {
  const summary = data?.summary || {
    NORMAL: { count: 0, quantity: 0, percentage: 0 },
    LOW: { count: 0, quantity: 0, percentage: 0 },
    OUT: { count: 0, quantity: 0, percentage: 0 },
    OVER: { count: 0, quantity: 0, percentage: 0 },
  };

  const normal = summary.NORMAL || { count: 0, quantity: 0, percentage: 0 };
  const low = summary.LOW || { count: 0, quantity: 0, percentage: 0 };
  const out = summary.OUT || { count: 0, quantity: 0, percentage: 0 };
  const over = summary.OVER || { count: 0, quantity: 0, percentage: 0 };

  const distributionSegments = [
    { label: 'Normal Stock', value: normal.count, color: 'bg-emerald-500' },
    { label: 'Low Stock', value: low.count, color: 'bg-amber-500' },
    { label: 'Out of Stock', value: out.count, color: 'bg-rose-500' },
    { label: 'Overstock', value: over.count, color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 4 Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-800">Normal Stock</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-950">
            {normal.count} <span className="text-sm font-normal text-emerald-700">records</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            {normal.quantity.toLocaleString()} units ({normal.percentage}%)
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-amber-800">Low Stock Warning</span>
            <AlertTriangle className="size-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-950">
            {low.count} <span className="text-sm font-normal text-amber-700">records</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            {low.quantity.toLocaleString()} units ({low.percentage}%)
          </p>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-rose-800">Out of Stock Alert</span>
            <AlertCircle className="size-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-950">
            {out.count} <span className="text-sm font-normal text-rose-700">records</span>
          </div>
          <p className="mt-1 text-xs text-rose-700">
            {out.quantity.toLocaleString()} units ({out.percentage}%)
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-blue-800">Overstock</span>
            <TrendingUp className="size-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-950">
            {over.count} <span className="text-sm font-normal text-blue-700">records</span>
          </div>
          <p className="mt-1 text-xs text-blue-700">
            {over.quantity.toLocaleString()} units ({over.percentage}%)
          </p>
        </div>
      </div>

      {/* Distribution Progress */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Stock Health Distribution</h3>
        <DistributionBar segments={distributionSegments} totalValue={data?.totalRecords || 0} />
      </div>

      {/* Drilldown Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Inventory Status Drill-down</h3>
            <p className="text-xs text-gray-500">Live stock level vs minimum safety and maximum limits</p>
          </div>
          <span className="text-xs text-gray-500">Showing top {(data?.items || []).length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Part Name & SKU</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3 text-right">Current Qty</th>
                <th className="px-6 py-3 text-right">Min Threshold</th>
                <th className="px-6 py-3 text-right">Max Limit</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.items || []).length > 0 ? (
                (data?.items || []).map((item) => {
                  let statusBadge = (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      NORMAL
                    </span>
                  );
                  if (item.status === 'LOW') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        LOW STOCK
                      </span>
                    );
                  } else if (item.status === 'OUT') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        OUT OF STOCK
                      </span>
                    );
                  } else if (item.status === 'OVER') {
                    statusBadge = (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        OVERSTOCK
                      </span>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-medium text-gray-900">{item.partName}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{item.categoryName}</td>
                      <td className="px-6 py-3.5 text-gray-600">
                        {item.warehouseName}{' '}
                        <span className="text-xs text-gray-400 font-mono">({item.warehouseCode})</span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right text-gray-500">{item.minStock}</td>
                      <td className="px-6 py-3.5 text-right text-gray-500">{item.maxStock}</td>
                      <td className="px-6 py-3.5 text-center">{statusBadge}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No inventory records match the selected status filters.
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
