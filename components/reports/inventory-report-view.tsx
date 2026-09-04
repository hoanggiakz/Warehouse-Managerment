'use client';

import React from 'react';
import { ReportKpiCard } from './report-kpi-card';
import { MetricProgressBar } from './visualizations/metric-progress-bar';
import { Boxes, Building2, AlertTriangle, AlertCircle, Layers } from 'lucide-react';

interface InventoryReportViewProps {
  data: {
    totalParts: number;
    totalQuantity: number;
    totalWarehouses: number;
    inventoryRecordsCount: number;
    normalCount: number;
    lowCount: number;
    outCount: number;
    overCount: number;
    warehouseBreakdown: Array<{
      warehouseId: number;
      code: string;
      name: string;
      partCount: number;
      totalQuantity: number;
      lowStock: number;
      outOfStock: number;
      overStock: number;
      currentOccupancy: number;
      capacity: number;
      utilizationRate: number;
    }>;
    categoryBreakdown: Array<{
      categoryId: number;
      name: string;
      partCount: number;
      totalQuantity: number;
      lowStock: number;
      outOfStock: number;
    }>;
  };
}

export function InventoryReportView({ data }: InventoryReportViewProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          title="Total Stock On Hand"
          value={`${data.totalQuantity.toLocaleString()} pcs`}
          subtitle={`Across ${data.inventoryRecordsCount} warehouse records`}
          icon={Boxes}
          variant="default"
        />
        <ReportKpiCard
          title="Active Parts"
          value={data.totalParts}
          subtitle={`Managed across ${data.totalWarehouses} facilities`}
          icon={Layers}
          variant="info"
        />
        <ReportKpiCard
          title="Low Stock Items"
          value={data.lowCount}
          subtitle="At or below safety minimum"
          icon={AlertTriangle}
          variant="warning"
        />
        <ReportKpiCard
          title="Out of Stock"
          value={data.outCount}
          subtitle="Zero units on shelf"
          icon={AlertCircle}
          variant="danger"
        />
      </div>

      {/* Inventory by Warehouse */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Inventory by Warehouse Facility</h3>
            <p className="text-xs text-gray-500">Stock distribution, stock alarms, and storage occupancy</p>
          </div>
          <span className="text-xs font-medium text-gray-500">{data.warehouseBreakdown.length} Facilities</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3 text-right">Parts Stored</th>
                <th className="px-6 py-3 text-right">Total Units</th>
                <th className="px-6 py-3 text-right">Low Stock</th>
                <th className="px-6 py-3 text-right">Out of Stock</th>
                <th className="px-6 py-3 text-right">Overstock</th>
                <th className="px-6 py-3 min-w-[180px]">Capacity & Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.warehouseBreakdown.length > 0 ? (
                data.warehouseBreakdown.map((wh) => (
                  <tr key={wh.warehouseId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{wh.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{wh.code}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">
                      {wh.partCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                      {wh.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {wh.lowStock > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {wh.lowStock}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {wh.outOfStock > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          {wh.outOfStock}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {wh.overStock}
                    </td>
                    <td className="px-6 py-4">
                      <MetricProgressBar
                        value={wh.utilizationRate}
                        sublabel={`${wh.currentOccupancy.toLocaleString()} / ${wh.capacity.toLocaleString()} units`}
                        variant={wh.utilizationRate > 90 ? 'danger' : wh.utilizationRate > 75 ? 'warning' : 'success'}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                    No warehouse inventory data available for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inventory by Category */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Inventory by Part Category</h3>
          <p className="text-xs text-gray-500">Stock depth and availability across component categories</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b">
              <tr>
                <th className="px-6 py-3">Category Name</th>
                <th className="px-6 py-3 text-right">Part Variants</th>
                <th className="px-6 py-3 text-right">Total Quantity</th>
                <th className="px-6 py-3 text-right">Low Stock Items</th>
                <th className="px-6 py-3 text-right">Out of Stock Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.categoryBreakdown.length > 0 ? (
                data.categoryBreakdown.map((cat) => (
                  <tr key={cat.categoryId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">{cat.partCount}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{cat.totalQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      {cat.lowStock > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                          {cat.lowStock}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cat.outOfStock > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">
                          {cat.outOfStock}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No category data found.
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
