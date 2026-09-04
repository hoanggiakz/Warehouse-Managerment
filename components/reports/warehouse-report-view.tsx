'use client';

import React from 'react';
import { MetricProgressBar } from './visualizations/metric-progress-bar';
import { Building2, BoxSelect, AlertTriangle, ArrowDownLeft, ArrowUpRight, ClipboardCheck, ShieldCheck } from 'lucide-react';

interface WarehouseReportViewProps {
  data: {
    warehouses: Array<{
      warehouseId: number;
      code: string;
      name: string;
      capacity: number;
      occupancy: number;
      utilizationRate: number;
      partCount: number;
      totalInventory: number;
      lowStockCount: number;
      outOfStockCount: number;
      importActivityCount: number;
      exportActivityCount: number;
      stockCheckActivityCount: number;
      qcActivityCount: number;
    }>;
  };
}

export function WarehouseReportView({ data }: WarehouseReportViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.warehouses.map((wh) => (
          <div
            key={wh.warehouseId}
            className="rounded-xl border bg-white p-5 shadow-sm space-y-4 hover:shadow transition-shadow"
          >
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-gray-900">{wh.name}</h4>
                <p className="text-xs font-mono text-gray-400">{wh.code}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-2 text-primary">
                <Building2 className="size-4" />
              </div>
            </div>

            {/* Utilization Bar */}
            <div className="space-y-1">
              <MetricProgressBar
                value={wh.utilizationRate}
                label="Storage Utilization"
                sublabel={`${wh.occupancy.toLocaleString()} / ${wh.capacity.toLocaleString()} unit capacity`}
                variant={wh.utilizationRate > 90 ? 'danger' : wh.utilizationRate > 75 ? 'warning' : 'success'}
              />
            </div>

            {/* Stock Snapshot Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center">
              <div className="rounded-lg bg-gray-50 p-2">
                <span className="text-[11px] font-medium text-gray-500 block">Part Types</span>
                <span className="text-sm font-bold text-gray-900">{wh.partCount}</span>
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <span className="text-[11px] font-medium text-gray-500 block">Total Qty</span>
                <span className="text-sm font-bold text-gray-900">{wh.totalInventory.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-amber-50 p-2">
                <span className="text-[11px] font-medium text-amber-700 block">Low/Out</span>
                <span className="text-sm font-bold text-amber-900">
                  {wh.lowStockCount + wh.outOfStockCount}
                </span>
              </div>
            </div>

            {/* Operational Activities */}
            <div className="border-t pt-3 space-y-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Operational Records
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <ArrowDownLeft className="size-3.5 text-emerald-600" />
                  <span>Imports: <strong>{wh.importActivityCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="size-3.5 text-blue-600" />
                  <span>Exports: <strong>{wh.exportActivityCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck className="size-3.5 text-indigo-600" />
                  <span>Stock Audits: <strong>{wh.stockCheckActivityCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-purple-600" />
                  <span>QC Checks: <strong>{wh.qcActivityCount}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
